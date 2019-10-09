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

// search interface
import { SearchResponse, SearchHit, SignalHit } from '../../types';

export const signalsAlertType: AlertType = {
  id: SIGNALS_ID,
  name: 'SIEM Signals',
  actionGroups: ['default'],
  validate: {
    params: schema.object({
      description: schema.string(),
      from: schema.string(),
      filter: schema.maybe(schema.object({}, { allowUnknowns: true })),
      id: schema.number(),
      index: schema.arrayOf(schema.string()),
      kql: schema.maybe(schema.string({ defaultValue: undefined })),
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

    const indexPatterns = index.map((element: string) => `"${element}"`).join(',');
    const refs = references.map((element: string) => `"${element}"`).join(',');
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

    // format scroll search result for signals index.
    const buildBulkBody = (doc: SearchHit): SignalHit => ({
      ...doc._source,
      signal: {
        rule_revision: 1,
        rule_id: id,
        rule_type: type,
        parent: {
          id: doc._id,
          type: 'event',
          depth: 1,
        },
        name,
        severity,
        description,
        time_detected: Date.now(),
        index_patterns: indexPatterns,
        references: refs,
      },
    });

    async function bulkIndex(someResult: SearchResponse<object>): Promise<boolean> {
      services.log(['info', 'SIEM'], '[+] starting bulk insertion');
      const bulkBody = someResult.hits.hits.flatMap((doc: SearchHit) => [
        {
          index: { _index: process.env.SIGNALS_INDEX || '.siem-signals-10-01-2019', _id: doc._id },
        },
        buildBulkBody(doc),
      ]);
      await services.callCluster('bulk', {
        refresh: true,
        body: bulkBody,
      });
      while (true) {
        let nextScrollResult;
        try {
          nextScrollResult = await services.callCluster('scroll', {
            scroll,
            scrollId: someResult._scroll_id,
          });
          if (nextScrollResult.hits.hits.length === 0) {
            // reached end of scroll
            services.log(['info', 'SIEM'], `Returning concatenated result`);
            return true;
          }
        } catch (exc) {
          services.log(['error', 'SIEM'], `[-] nextScroll threw an error ${JSON.stringify(exc)}`);
        }
        let bulkResponse;
        try {
          bulkResponse = await services.callCluster('bulk', {
            refresh: true,
            body: nextScrollResult.hits.hits.flatMap((doc: SearchHit) => [
              {
                index: {
                  _index: process.env.SIGNALS_INDEX || '.siem-signals-10-01-2019',
                  _id: doc._id,
                },
              },
              buildBulkBody(doc),
            ]),
          });
        } catch (exc) {
          services.log(['error', 'SIEM'], `[-] bulkResponse threw an error ${JSON.stringify(exc)}`);
        }
        if (bulkResponse.errors) {
          services.log(
            ['error', 'SIEM'],
            `[-] bulkResponse had errors: ${JSON.stringify(bulkResponse.errors, null, 2)}}`
          );
          return false;
        }
      }
    }

    try {
      services.log(['info', 'SIEM'], 'Starting SIEM signal job');

      // TODO: Comment this in eventually and use this for manual insertion of the
      // signals instead of the ReIndex() api

      if (process.env.USE_SCROLL_BULK_INDEX === 'USE_SCROLL_BULK_INDEX') {
        services.log(['info', 'SIEM'], `[+] Initial search call`);
        const noReIndexResult = await services.callCluster('search', noReIndex);
        services.log(
          ['info', 'SIEM'],
          `Total docs to reindex: ${noReIndexResult.hits.total.value}`
        );
        const bulkIndexResult = await bulkIndex(noReIndexResult);
        if (bulkIndexResult) {
          services.log(['info', 'SIEM'], 'Finished SIEM signal job');
        } else {
          services.log(['error', 'SIEM'], 'Error processing SIEM signal job');
        }
      } else {
        // eslint-disable-next-line
        const result = await services.callCluster('reindex', reIndex);

        // TODO: Error handling here and writing of any errors that come back from ES by
        services.log(['info', 'SIEM'], `Result of reindex: ${JSON.stringify(result, null, 2)}`);
      }
    } catch (err) {
      // TODO: Error handling and writing of errors into a signal that has error
      // handling/conditions
      services.log(['error', 'SIEM'], `You encountered an error of: ${err.message}`);
    }

      // Schedule the default action which is nothing if it's a plain signal.
      instance.scheduleActions('default');
    },
  };
};
