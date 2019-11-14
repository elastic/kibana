/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { SIGNALS_ID, DEFAULT_SIGNALS_INDEX } from '../../../../common/constants';
import { Logger } from '../../../../../../../../src/core/server';
// TODO: Remove this for the build_events_query call eventually
import { buildEventsReIndex } from './build_events_reindex';

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
        id: schema.string(),
        immutable: schema.boolean({ defaultValue: false }),
        index: schema.arrayOf(schema.string()),
        language: schema.nullable(schema.string()),
        savedId: schema.nullable(schema.string()),
        query: schema.nullable(schema.string()),
        filters: schema.nullable(schema.arrayOf(schema.object({}, { allowUnknowns: true }))),
        maxSignals: schema.number({ defaultValue: 100 }),
        severity: schema.string(),
        tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
        to: schema.string(),
        type: schema.string(),
        references: schema.arrayOf(schema.string(), { defaultValue: [] }),
        size: schema.maybe(schema.number()),
      }),
    },
    async executor({ services, params }) {
      const {
        description,
        filter,
        from,
        id,
        index,
        filters,
        language,
        savedId,
        query,
        maxSignals,
        name,
        references,
        severity,
        to,
        type,
        size,
      } = params;

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
        maxDocs: maxSignals,
        searchAfterSortId: undefined,
      });

      try {
        logger.debug(`Starting signal rule "${id}"`);
        if (process.env.USE_REINDEX_API === 'true') {
          const reIndex = buildEventsReIndex({
            index,
            from,
            to,
            // TODO: Change this out once we have solved
            // https://github.com/elastic/kibana/issues/47002
            signalsIndex: process.env.SIGNALS_INDEX || DEFAULT_SIGNALS_INDEX,
            severity,
            description,
            name,
            timeDetected: new Date().toISOString(),
            filter: esFilter,
            maxDocs: maxSignals,
            ruleRevision: 1,
            id,
            type,
            references,
          });
          const result = await services.callCluster('reindex', reIndex);
          if (result.total > 0) {
            logger.info(
              `Total signals found from signal rule "${id}" (reindex algorithm): ${result.total}`
            );
          }
        } else {
          logger.debug(`[+] Initial search call of signal rule "${id}"`);
          const noReIndexResult = await services.callCluster('search', noReIndex);
          if (noReIndexResult.hits.total.value !== 0) {
            logger.info(
              `Total signals found from signal rule "${id}": ${noReIndexResult.hits.total.value}`
            );
          }

          const bulkIndexResult = await searchAfterAndBulkIndex(
            noReIndexResult,
            params,
            services,
            logger
          );

          if (bulkIndexResult) {
            logger.debug(`Finished signal rule "${id}"`);
          } else {
            logger.error(`Error processing signal rule "${id}"`);
          }
        }
      } catch (err) {
        // TODO: Error handling and writing of errors into a signal that has error
        // handling/conditions
        logger.error(`Error from signal rule "${id}", ${err.message}`);
      }
    },
  };
};
