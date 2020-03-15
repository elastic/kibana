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
        from,
        ruleId,
        index,
        filters,
        language,
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

      writeGapErrorToSavedObject({
        alertId,
        logger,
        ruleId: ruleId ?? '(unknown rule id)',
        currentStatusSavedObject,
        services,
        gap,
        ruleStatusSavedObjects,
        name,
      });
      // set searchAfter page size to be the lesser of default page size or maxSignals.
      const searchAfterSize =
        DEFAULT_SEARCH_AFTER_PAGE_SIZE <= params.maxSignals
          ? DEFAULT_SEARCH_AFTER_PAGE_SIZE
          : params.maxSignals;
      try {
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

        try {
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

          const bulkIndexResult = await searchAfterAndBulkCreate({
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

          if (bulkIndexResult) {
            logger.debug(
              `Finished signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}"`
            );
            writeCurrentStatusSucceeded({
              services,
              currentStatusSavedObject,
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
            });
          }
        } catch (err) {
          await writeSignalRuleExceptionToSavedObject({
            name,
            alertId,
            currentStatusSavedObject,
            logger,
            message: err?.message ?? '(no error message given)',
            services,
            ruleStatusSavedObjects,
            ruleId: ruleId ?? '(unknown rule id)',
          });
        }
      } catch (exception) {
        await writeSignalRuleExceptionToSavedObject({
          name,
          alertId,
          currentStatusSavedObject,
          logger,
          message: exception?.message ?? '(no error message given)',
          services,
          ruleStatusSavedObjects,
          ruleId: ruleId ?? '(unknown rule id)',
        });
      }
    },
  };
};
