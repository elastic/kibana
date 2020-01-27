/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { Logger } from 'src/core/server';
import {
  SIGNALS_ID,
  DEFAULT_MAX_SIGNALS,
  DEFAULT_SEARCH_AFTER_PAGE_SIZE,
} from '../../../../common/constants';

import { buildEventsSearchQuery } from './build_events_query';
import { getInputIndex } from './get_input_output_index';
import { searchAfterAndBulkCreate } from './search_after_bulk_create';
import { getFilter } from './get_filter';
import { SignalRuleAlertTypeDefinition } from './types';

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
    actionGroups: ['default'],
    validate: {
      params: schema.object({
        createdAt: schema.string(),
        description: schema.string(),
        falsePositives: schema.arrayOf(schema.string(), { defaultValue: [] }),
        from: schema.string(),
        ruleId: schema.string(),
        immutable: schema.boolean({ defaultValue: false }),
        index: schema.nullable(schema.arrayOf(schema.string())),
        language: schema.nullable(schema.string()),
        outputIndex: schema.nullable(schema.string()),
        savedId: schema.nullable(schema.string()),
        timelineId: schema.nullable(schema.string()),
        meta: schema.nullable(schema.object({}, { allowUnknowns: true })),
        query: schema.nullable(schema.string()),
        filters: schema.nullable(schema.arrayOf(schema.object({}, { allowUnknowns: true }))),
        maxSignals: schema.number({ defaultValue: DEFAULT_MAX_SIGNALS }),
        riskScore: schema.number(),
        severity: schema.string(),
        threats: schema.nullable(schema.arrayOf(schema.object({}, { allowUnknowns: true }))),
        to: schema.string(),
        type: schema.string(),
        updatedAt: schema.string(),
        references: schema.arrayOf(schema.string(), { defaultValue: [] }),
        version: schema.number({ defaultValue: 1 }),
      }),
    },
    async executor({ alertId, services, params }) {
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

      // TODO: Remove this hard extraction of name once this is fixed: https://github.com/elastic/kibana/issues/50522
      const savedObject = await services.savedObjectsClient.get('alert', alertId);
      const name: string = savedObject.attributes.name;
      const tags: string[] = savedObject.attributes.tags;

      const createdBy: string = savedObject.attributes.createdBy;
      const updatedBy: string = savedObject.attributes.updatedBy;
      const interval: string = savedObject.attributes.interval;
      const enabled: boolean = savedObject.attributes.enabled;

      // set searchAfter page size to be the lesser of default page size or maxSignals.
      const searchAfterSize =
        DEFAULT_SEARCH_AFTER_PAGE_SIZE <= params.maxSignals
          ? DEFAULT_SEARCH_AFTER_PAGE_SIZE
          : params.maxSignals;

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
          updatedBy,
          interval,
          enabled,
          pageSize: searchAfterSize,
          tags,
        });

        if (bulkIndexResult) {
          logger.debug(
            `Finished signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}"`
          );
        } else {
          logger.error(
            `Error processing signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}"`
          );
        }
      } catch (err) {
        // TODO: Error handling and writing of errors into a signal that has error
        // handling/conditions
        logger.error(
          `Error from signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}"`
        );
      }
    },
  };
};
