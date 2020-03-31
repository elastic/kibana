/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { performance } from 'perf_hooks';
import { Logger } from 'src/core/server';

import { SIGNALS_ID, DEFAULT_SEARCH_AFTER_PAGE_SIZE } from '../../../../common/constants';
import { isJobStarted, isMlRule } from '../../../../common/detection_engine/ml_helpers';
import { SetupPlugins } from '../../../plugin';

import { buildEventsSearchQuery } from './build_events_query';
import { getInputIndex } from './get_input_output_index';
import {
  searchAfterAndBulkCreate,
  SearchAfterAndBulkCreateReturnType,
} from './search_after_bulk_create';
import { getFilter } from './get_filter';
import { SignalRuleAlertTypeDefinition, RuleAlertAttributes } from './types';
import { getGapBetweenRuns, makeFloatString } from './utils';
import { signalParamsSchema } from './signal_params_schema';
import { siemRuleActionGroups } from './siem_rule_action_groups';
import { findMlSignals } from './find_ml_signals';
import { bulkCreateMlSignals } from './bulk_create_ml_signals';
import { getSignalsCount } from '../notifications/get_signals_count';
import { scheduleNotificationActions } from '../notifications/schedule_notification_actions';
import { ruleStatusServiceFactory } from './rule_status_service';
import { buildRuleMessageFactory } from './rule_messages';
import { ruleStatusSavedObjectsClientFactory } from './rule_status_saved_objects_client';

export const signalRulesAlertType = ({
  logger,
  version,
  ml,
}: {
  logger: Logger;
  version: string;
  ml: SetupPlugins['ml'];
}): SignalRuleAlertTypeDefinition => {
  return {
    id: SIGNALS_ID,
    name: 'SIEM Signals',
    actionGroups: siemRuleActionGroups,
    defaultActionGroupId: 'default',
    validate: {
      params: signalParamsSchema(),
    },
    async executor({ previousStartedAt, alertId, services, params }) {
      const {
        anomalyThreshold,
        from,
        ruleId,
        index,
        filters,
        language,
        meta,
        machineLearningJobId,
        outputIndex,
        savedId,
        query,
        to,
        type,
      } = params;
      const ruleStatusClient = ruleStatusSavedObjectsClientFactory(services.savedObjectsClient);
      const ruleStatusService = await ruleStatusServiceFactory({
        alertId,
        ruleStatusClient,
      });
      const savedObject = await services.savedObjectsClient.get<RuleAlertAttributes>(
        'alert',
        alertId
      );
      const {
        actions,
        name,
        tags,
        createdAt,
        createdBy,
        updatedBy,
        enabled,
        schedule: { interval },
        throttle,
        params: ruleParams,
      } = savedObject.attributes;
      const updatedAt = savedObject.updated_at ?? '';
      const buildRuleMessage = buildRuleMessageFactory({
        id: alertId,
        ruleId,
        name,
        index: outputIndex,
      });

      logger.debug(buildRuleMessage('[+] Starting Signal Rule execution'));
      await ruleStatusService.goingToRun();

      const gap = getGapBetweenRuns({ previousStartedAt, interval, from, to });
      if (gap != null && gap.asMilliseconds() > 0) {
        const gapString = gap.humanize();
        const gapMessage = buildRuleMessage(
          `${gapString} (${gap.asMilliseconds()}ms) has passed since last rule execution, and signals may have been missed.`,
          'Consider increasing your look behind time or adding more Kibana instances.'
        );
        logger.warn(gapMessage);

        await ruleStatusService.error(gapMessage, { gap: gapString });
      }

      const searchAfterSize = Math.min(params.maxSignals, DEFAULT_SEARCH_AFTER_PAGE_SIZE);
      let result: SearchAfterAndBulkCreateReturnType = {
        success: false,
        bulkCreateTimes: [],
        searchAfterTimes: [],
        lastLookBackDate: null,
      };

      try {
        if (isMlRule(type)) {
          if (ml == null) {
            throw new Error('ML plugin unavailable during rule execution');
          }
          if (machineLearningJobId == null || anomalyThreshold == null) {
            throw new Error(
              [
                'Machine learning rule is missing job id and/or anomaly threshold:',
                `job id: "${machineLearningJobId}"`,
                `anomaly threshold: "${anomalyThreshold}"`,
              ].join('\n')
            );
          }

          const summaryJobs = await ml
            .jobServiceProvider(ml.mlClient.callAsInternalUser)
            .jobsSummary([machineLearningJobId]);
          const jobSummary = summaryJobs.find(job => job.id === machineLearningJobId);

          if (jobSummary == null || !isJobStarted(jobSummary.jobState, jobSummary.datafeedState)) {
            const errorMessage = buildRuleMessage(
              'Machine learning job is not started:',
              `job id: "${machineLearningJobId}"`,
              `job status: "${jobSummary?.jobState}"`,
              `datafeed status: "${jobSummary?.datafeedState}"`
            );
            logger.warn(errorMessage);
            await ruleStatusService.error(errorMessage);
          }

          const anomalyResults = await findMlSignals(
            machineLearningJobId,
            anomalyThreshold,
            from,
            to,
            services.callCluster
          );
          const anomalyCount = anomalyResults.hits.hits.length;
          if (anomalyCount) {
            logger.info(buildRuleMessage(`Found ${anomalyCount} signals from ML anomalies.`));
          }

          const { success, bulkCreateDuration } = await bulkCreateMlSignals({
            actions,
            throttle,
            someResult: anomalyResults,
            ruleParams: params,
            services,
            logger,
            id: alertId,
            signalsIndex: outputIndex,
            name,
            createdBy,
            createdAt,
            updatedBy,
            updatedAt,
            interval,
            enabled,
            tags,
          });
          result.success = success;
          if (bulkCreateDuration) {
            result.bulkCreateTimes.push(bulkCreateDuration);
          }
        } else {
          const inputIndex = await getInputIndex(services, version, index);
          const esFilter = await getFilter({
            type,
            filters,
            language,
            query,
            savedId,
            services,
            index: inputIndex,
          });

          const noReIndex = buildEventsSearchQuery({
            index: inputIndex,
            from,
            to,
            filter: esFilter,
            size: searchAfterSize,
            searchAfterSortId: undefined,
          });

          logger.debug(buildRuleMessage('[+] Initial search call'));
          const start = performance.now();
          const noReIndexResult = await services.callCluster('search', noReIndex);
          const end = performance.now();

          const signalCount = noReIndexResult.hits.total.value;
          if (signalCount !== 0) {
            logger.info(
              buildRuleMessage(
                `Found ${signalCount} signals from the indexes of "[${inputIndex.join(', ')}]"`
              )
            );
          }

          result = await searchAfterAndBulkCreate({
            someResult: noReIndexResult,
            ruleParams: params,
            services,
            logger,
            id: alertId,
            inputIndexPattern: inputIndex,
            signalsIndex: outputIndex,
            filter: esFilter,
            actions,
            name,
            createdBy,
            createdAt,
            updatedBy,
            updatedAt,
            interval,
            enabled,
            pageSize: searchAfterSize,
            tags,
            throttle,
          });
          result.searchAfterTimes.push(makeFloatString(end - start));
        }

        if (result.success) {
          if (actions.length) {
            const notificationRuleParams = {
              ...ruleParams,
              name,
              id: savedObject.id,
            };
            const { signalsCount, resultsLink } = await getSignalsCount({
              from: `now-${interval}`,
              to: 'now',
              index: ruleParams.outputIndex,
              ruleId: ruleParams.ruleId!,
              kibanaSiemAppUrl: meta?.kibanaSiemAppUrl as string,
              ruleAlertId: savedObject.id,
              callCluster: services.callCluster,
            });

            logger.info(buildRuleMessage(`Found ${signalsCount} signals for notification.`));

            if (signalsCount) {
              const alertInstance = services.alertInstanceFactory(alertId);
              scheduleNotificationActions({
                alertInstance,
                signalsCount,
                resultsLink,
                ruleParams: notificationRuleParams,
              });
            }
          }

          logger.debug(buildRuleMessage('[+] Signal Rule execution completed.'));
          await ruleStatusService.success('succeeded', {
            bulkCreateTimeDurations: result.bulkCreateTimes,
            searchAfterTimeDurations: result.searchAfterTimes,
            lastLookBackDate: result.lastLookBackDate?.toISOString(),
          });
        } else {
          const errorMessage = buildRuleMessage(
            'Bulk Indexing of signals failed. Check logs for further details.'
          );
          logger.error(errorMessage);
          await ruleStatusService.error(errorMessage, {
            bulkCreateTimeDurations: result.bulkCreateTimes,
            searchAfterTimeDurations: result.searchAfterTimes,
            lastLookBackDate: result.lastLookBackDate?.toISOString(),
          });
        }
      } catch (error) {
        const errorMessage = error.message ?? '(no error message given)';
        const message = buildRuleMessage(
          'An error occurred during rule execution:',
          `message: "${errorMessage}"`
        );

        logger.error(message);
        await ruleStatusService.error(message, {
          bulkCreateTimeDurations: result.bulkCreateTimes,
          searchAfterTimeDurations: result.searchAfterTimes,
          lastLookBackDate: result.lastLookBackDate?.toISOString(),
        });
      }
    },
  };
};
