/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { performance } from 'perf_hooks';
import { Logger } from 'src/core/server';
import { SIGNALS_ID, DEFAULT_SEARCH_AFTER_PAGE_SIZE } from '../../../../common/constants';

import { buildEventsSearchQuery } from './build_events_query';
import { getInputIndex } from './get_input_output_index';
import {
  searchAfterAndBulkCreate,
  SearchAfterAndBulkCreateReturnType,
} from './search_after_bulk_create';
import { getFilter } from './get_filter';
import { SignalRuleAlertTypeDefinition, RuleAlertAttributes } from './types';
import { getGapBetweenRuns, makeFloatString } from './utils';
import { writeSignalRuleExceptionToSavedObject } from './write_signal_rule_exception_to_saved_object';
import { signalParamsSchema } from './signal_params_schema';
import { siemRuleActionGroups } from './siem_rule_action_groups';
import { writeGapErrorToSavedObject } from './write_gap_error_to_saved_object';
import { getRuleStatusSavedObjects } from './get_rule_status_saved_objects';
import { getCurrentStatusSavedObject } from './get_current_status_saved_object';
import { writeCurrentStatusSucceeded } from './write_current_status_succeeded';
import { findMlSignals } from './find_ml_signals';
import { bulkCreateMlSignals } from './bulk_create_ml_signals';
import { getSignalsCount } from '../notifications/get_signals_count';
import { scheduleNotificationActions } from '../notifications/schedule_notification_actions';

export const signalRulesAlertType = ({
  logger,
  version,
}: {
  logger: Logger;
  version: string;
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
      const savedObject = await services.savedObjectsClient.get<RuleAlertAttributes>(
        'alert',
        alertId
      );

      const ruleStatusSavedObjects = await getRuleStatusSavedObjects({
        alertId,
        services,
      });

      const currentStatusSavedObject = await getCurrentStatusSavedObject({
        alertId,
        services,
        ruleStatusSavedObjects,
      });

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

      const gap = getGapBetweenRuns({ previousStartedAt, interval, from, to });
      await writeGapErrorToSavedObject({
        alertId,
        logger,
        ruleId: ruleId ?? '(unknown rule id)',
        currentStatusSavedObject,
        services,
        gap,
        ruleStatusSavedObjects,
        name,
      });

      const searchAfterSize = Math.min(params.maxSignals, DEFAULT_SEARCH_AFTER_PAGE_SIZE);
      let creationSucceeded: SearchAfterAndBulkCreateReturnType = {
        success: false,
        bulkCreateTimes: [],
        searchAfterTimes: [],
        lastLookBackDate: null,
      };

      try {
        if (type === 'machine_learning') {
          if (machineLearningJobId == null || anomalyThreshold == null) {
            throw new Error(
              `Attempted to execute machine learning rule, but it is missing job id and/or anomaly threshold for rule id: "${ruleId}", name: "${name}", signals index: "${outputIndex}", job id: "${machineLearningJobId}", anomaly threshold: "${anomalyThreshold}"`
            );
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
            logger.info(
              `Found ${anomalyCount} signals from ML anomalies for signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}", pushing signals to index "${outputIndex}"`
            );
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
          creationSucceeded.success = success;
          if (bulkCreateDuration) {
            creationSucceeded.bulkCreateTimes.push(bulkCreateDuration);
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

          logger.debug(
            `Starting signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}"`
          );
          logger.debug(
            `[+] Initial search call of signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}"`
          );
          const start = performance.now();
          const noReIndexResult = await services.callCluster('search', noReIndex);
          const end = performance.now();

          if (noReIndexResult.hits.total.value !== 0) {
            logger.info(
              `Found ${
                noReIndexResult.hits.total.value
              } signals from the indexes of "[${inputIndex.join(
                ', '
              )}]" using signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}", pushing signals to index "${outputIndex}"`
            );
          }

          creationSucceeded = await searchAfterAndBulkCreate({
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
          creationSucceeded.searchAfterTimes.push(makeFloatString(end - start));
        }

        if (creationSucceeded.success) {
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

            logger.info(
              `Found ${signalsCount} signals using signal rule name: "${notificationRuleParams.name}", id: "${notificationRuleParams.ruleId}", rule_id: "${notificationRuleParams.ruleId}" in "${notificationRuleParams.outputIndex}" index`
            );

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

          logger.debug(
            `Finished signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}"`
          );
          await writeCurrentStatusSucceeded({
            services,
            currentStatusSavedObject,
            bulkCreateTimes: creationSucceeded.bulkCreateTimes,
            searchAfterTimes: creationSucceeded.searchAfterTimes,
            lastLookBackDate: creationSucceeded.lastLookBackDate?.toISOString() ?? null,
          });
        } else {
          await writeSignalRuleExceptionToSavedObject({
            name,
            alertId,
            currentStatusSavedObject,
            logger,
            message: `Bulk Indexing signals failed. Check logs for further details \nRule name: "${name}"\nid: "${alertId}"\nrule_id: "${ruleId}"\n`,
            services,
            ruleStatusSavedObjects,
            ruleId: ruleId ?? '(unknown rule id)',
            bulkCreateTimes: creationSucceeded.bulkCreateTimes,
            searchAfterTimes: creationSucceeded.searchAfterTimes,
            lastLookBackDate: creationSucceeded.lastLookBackDate?.toISOString() ?? null,
          });
        }
      } catch (err) {
        await writeSignalRuleExceptionToSavedObject({
          name,
          alertId,
          currentStatusSavedObject,
          logger,
          message: `Bulk Indexing signals failed. Check logs for further details \nRule name: "${name}"\nid: "${alertId}"\nrule_id: "${ruleId}"\n`,
          services,
          ruleStatusSavedObjects,
          ruleId: ruleId ?? '(unknown rule id)',
          bulkCreateTimes: creationSucceeded.bulkCreateTimes,
          searchAfterTimes: creationSucceeded.searchAfterTimes,
          lastLookBackDate: creationSucceeded.lastLookBackDate?.toISOString() ?? null,
        });
      }
    },
  };
};
