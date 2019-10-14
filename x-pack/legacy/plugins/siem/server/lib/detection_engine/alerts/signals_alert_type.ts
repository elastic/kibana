/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { SIGNALS_ID } from '../../../../common/constants';
import { Logger } from '../../../../../../../../src/core/server';
import { AlertType, AlertExecutorOptions } from '../../../../../alerting';

// TODO: Remove this for the build_events_query call eventually
import { buildEventsReIndex } from './build_events_reindex';

// TODO: Comment this in and use this instead of the reIndex API
// once scrolling and other things are done with it.
import { buildEventsScrollQuery } from './build_events_query';

// bulk scroll class
import { scrollAndBulkIndex } from './utils';

export const signalsAlertType = ({ logger }: { logger: Logger }): AlertType => {
  return {
    id: SIGNALS_ID,
    name: 'SIEM Signals',
    actionGroups: ['default'],
    validate: {
      params: schema.object({
        description: schema.string(),
        from: schema.string(),
        filter: schema.nullable(schema.object({}, { allowUnknowns: true })),
        id: schema.number(),
        index: schema.arrayOf(schema.string()),
        kql: schema.nullable(schema.string()),
        maxSignals: schema.number({ defaultValue: 100 }),
        name: schema.string(),
        severity: schema.number(),
        to: schema.string(),
        type: schema.string(),
        references: schema.arrayOf(schema.string(), { defaultValue: [] }),
        scrollSize: schema.maybe(schema.number()),
        scrollLock: schema.maybe(schema.string()),
      }),
    },
    // TODO: Type the params as it is all filled with any
    async executor({ services, params, state }: AlertExecutorOptions) {
      const instance = services.alertInstanceFactory('siem-signals');

      const {
        description,
        filter,
        from,
        id,
        index,
        kql,
        maxSignals,
        name,
        references,
        severity,
        to,
        type,
        scrollSize,
        scrollLock,
      } = params;

      const scroll = scrollLock ? scrollLock : '1m';
      const size = scrollSize ? scrollSize : 400;

      // TODO: Turn these options being sent in into a template for the alert type
      const noReIndex = buildEventsScrollQuery({
        index,
        from,
        to,
        kql,
        filter,
        size,
        scroll,
      });

      const reIndex = buildEventsReIndex({
        index,
        from,
        kql,
        to,
        // TODO: Change this out once we have solved
        // https://github.com/elastic/kibana/issues/47002
        signalsIndex: process.env.SIGNALS_INDEX || '.siem-signals-10-01-2019',
        severity,
        description,
        name,
        timeDetected: Date.now(),
        filter,
        maxDocs: maxSignals,
        ruleRevision: 1,
        id,
        type,
        references,
      });

      try {
        logger.info('Starting SIEM signal job');

        // TODO: Comment this in eventually and use this for manual insertion of the
        // signals instead of the ReIndex() api

        if (process.env.USE_REINDEX_API === 'true') {
          const result = await services.callCluster('reindex', reIndex);

          // TODO: Error handling here and writing of any errors that come back from ES by
          logger.info(`Result of reindex: ${JSON.stringify(result, null, 2)}`);
        } else {
          logger.info(`[+] Initial search call`);

          const noReIndexResult = await services.callCluster('search', noReIndex);
          logger.info(`Total docs to reindex: ${noReIndexResult.hits.total.value}`);

          const bulkIndexResult = await scrollAndBulkIndex(
            noReIndexResult,
            params,
            services,
            logger
          );

          if (bulkIndexResult) {
            logger.info('Finished SIEM signal job');
          } else {
            logger.error('Error processing SIEM signal job');
          }
        }
      } catch (err) {
        // TODO: Error handling and writing of errors into a signal that has error
        // handling/conditions
        logger.error(`You encountered an error of: ${err.message}`);
      }

      // Schedule the default action which is nothing if it's a plain signal.
      instance.scheduleActions('default');
    },
  };
};
