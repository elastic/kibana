/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'src/core/server';
import { SIGNALS_ID, DEFAULT_SEARCH_AFTER_PAGE_SIZE } from '../../../../common/constants';

import { buildEventsSearchQuery } from './build_events_query';
import { getInputIndex } from './get_input_output_index';
import { searchAfterAndBulkCreate } from './search_after_bulk_create';
import { getFilter } from './get_filter';
import { SignalRuleAlertTypeDefinition, AlertAttributes } from './types';
import { getGapBetweenRuns } from './utils';
import { writeSignalRuleExceptionToSavedObject } from './write_signal_rule_exception_to_saved_object';
import { signalParamsSchema } from './signal_params_schema';
import { siemRuleActionGroups } from './siem_rule_action_groups';
import { writeGapErrorToSavedObject } from './write_gap_error_to_saved_object';
import { getRuleStatusSavedObjects } from './get_rule_status_saved_objects';
import { getCurrentStatusSavedObject } from './get_current_status_saved_object';
import { writeCurrentStatusSucceeded } from './write_current_status_succeeded';
import { findMlSignals } from './find_ml_signals';
import { bulkCreateMlSignals } from './bulk_create_ml_signals';

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
        mlJobId,
        outputIndex,
        savedId,
        query,
        to,
        type,
      } = params;
      const savedObject = await services.savedObjectsClient.get<AlertAttributes>('alert', alertId);

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
        name,
        tags,
        createdAt,
        createdBy,
        updatedBy,
        enabled,
        schedule: { interval },
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
      let creationSucceeded = false;

      try {
        if (type === 'machine_learning') {
          if (mlJobId == null || anomalyThreshold == null) {
            throw new Error(
              `Attempted to execute machine learning rule, but it is missing job id and/or anomaly threshold for rule id: "${ruleId}", name: "${name}", signals index: "${outputIndex}", job id: "${mlJobId}", anomaly threshold: "${anomalyThreshold}"`
            );
          }

          const anomalyResults = await findMlSignals(
            mlJobId,
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

          creationSucceeded = await bulkCreateMlSignals({
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
        } else {
          if (index == null) {
            throw new Error(
              `Attempted to execute query rule, but it is missing index pattern for rule id: "${ruleId}", name: "${name}", signals index: "${outputIndex}", index pattern: "${index}"`
            );
          }

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
          const noReIndexResult = await services.callCluster('search', noReIndex);
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
            signalsIndex: outputIndex,
            filter: esFilter,
            name,
            createdBy,
            createdAt,
            updatedBy,
            updatedAt,
            interval,
            enabled,
            pageSize: searchAfterSize,
            tags,
          });
        }

        if (creationSucceeded) {
          logger.debug(
            `Finished signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}", output_index: "${outputIndex}"`
          );
          await writeCurrentStatusSucceeded({
            services,
            currentStatusSavedObject,
          });
        } else {
          await writeSignalRuleExceptionToSavedObject({
            name,
            alertId,
            currentStatusSavedObject,
            logger,
            message: `Bulk Indexing signals failed. Check logs for further details Rule name: "${name}" id: "${alertId}" rule_id: "${ruleId}" output_index: "${outputIndex}"`,
            services,
            ruleStatusSavedObjects,
            ruleId: ruleId ?? '(unknown rule id)',
          });
        }
      } catch (error) {
        await writeSignalRuleExceptionToSavedObject({
          name,
          alertId,
          currentStatusSavedObject,
          logger,
          message: error?.message ?? '(no error message given)',
          services,
          ruleStatusSavedObjects,
          ruleId: ruleId ?? '(unknown rule id)',
        });
      }
    },
  };
};
