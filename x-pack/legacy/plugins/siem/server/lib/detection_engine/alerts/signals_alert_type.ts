/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { Logger } from 'src/core/server';
import { SIGNALS_ID } from '../../../../common/constants';

import { buildEventsSearchQuery } from './build_events_query';
import { searchAfterAndBulkIndex } from './utils';
import { SignalAlertTypeDefinition } from './types';
import { getFilter } from './get_filter';

export const signalsAlertType = ({ logger }: { logger: Logger }): SignalAlertTypeDefinition => {
  return {
    id: SIGNALS_ID,
    name: 'SIEM Signals',
    actionGroups: ['default'],
    validate: {
      params: schema.object({
        description: schema.string(),
        falsePositives: schema.arrayOf(schema.string(), { defaultValue: [] }),
        from: schema.string(),
        filter: schema.nullable(schema.object({}, { allowUnknowns: true })),
        ruleId: schema.string(),
        immutable: schema.boolean({ defaultValue: false }),
        index: schema.arrayOf(schema.string()),
        language: schema.nullable(schema.string()),
        outputIndex: schema.string(),
        savedId: schema.nullable(schema.string()),
        meta: schema.nullable(schema.object({}, { allowUnknowns: true })),
        query: schema.nullable(schema.string()),
        filters: schema.nullable(schema.arrayOf(schema.object({}, { allowUnknowns: true }))),
        maxSignals: schema.number({ defaultValue: 10000 }),
        riskScore: schema.number(),
        severity: schema.string(),
        tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
        to: schema.string(),
        type: schema.string(),
        references: schema.arrayOf(schema.string(), { defaultValue: [] }),
        size: schema.maybe(schema.number()),
      }),
    },
    async executor({ alertId, services, params }) {
      const {
        filter,
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
        size,
      } = params;

      // TODO: Remove this hard extraction of name once this is fixed: https://github.com/elastic/kibana/issues/50522
      const savedObject = await services.savedObjectsClient.get('alert', alertId);
      const name: string = savedObject.attributes.name;

      const createdBy: string = savedObject.attributes.createdBy;
      const updatedBy: string = savedObject.attributes.updatedBy;
      const interval: string = savedObject.attributes.interval;
      const enabled: boolean = savedObject.attributes.enabled;

      const searchAfterSize = size ? size : 1000;

      const esFilter = await getFilter({
        type,
        filter,
        filters,
        language,
        query,
        savedId,
        services,
        index,
      });

      const noReIndex = buildEventsSearchQuery({
        index,
        from,
        to,
        filter: esFilter,
        size: searchAfterSize,
        searchAfterSortId: undefined,
      });

      try {
        logger.debug(`Starting signal rule "id: ${alertId}", "ruleId: ${ruleId}"`);
        logger.debug(
          `[+] Initial search call of signal rule "id: ${alertId}", "ruleId: ${ruleId}"`
        );
        const noReIndexResult = await services.callCluster('search', noReIndex);
        if (noReIndexResult.hits.total.value !== 0) {
          logger.info(
            `Total signals found from signal rule "id: ${alertId}", "ruleId: ${ruleId}": ${noReIndexResult.hits.total.value}`
          );
        }

        const bulkIndexResult = await searchAfterAndBulkIndex({
          someResult: noReIndexResult,
          signalParams: params,
          services,
          logger,
          id: alertId,
          signalsIndex: outputIndex,
          name,
          createdBy,
          updatedBy,
          interval,
          enabled,
        });

        if (bulkIndexResult) {
          logger.debug(`Finished signal rule "id: ${alertId}", "ruleId: ${ruleId}"`);
        } else {
          logger.error(`Error processing signal rule "id: ${alertId}", "ruleId: ${ruleId}"`);
        }
      } catch (err) {
        // TODO: Error handling and writing of errors into a signal that has error
        // handling/conditions
        logger.error(
          `Error from signal rule "id: ${alertId}", "ruleId: ${ruleId}", ${err.message}`
        );
      }
    },
  };
};
