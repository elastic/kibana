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
// import { buildEventsReIndex } from './build_events_reindex';

// TODO: Comment this in and use this instead of the reIndex API
// once scrolling and other things are done with it.
import { buildEventsScrollQuery, buildUpdateByQuery } from './build_events_query';

// search interface
import { SearchResponse, SearchHit } from '../../types';

export const signalsAlertType = ({ logger }: { logger: Logger }): AlertType => {
  return {
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
      }),
    },
    // TODO: Type the params as it is all filled with any
    async executor({ services, params, state }: AlertExecutorOptions) {
      const instance = services.alertInstanceFactory('siem-signals');

      // TODO: Comment this in eventually and use the buildEventsQuery()
      // for scrolling and other fun stuff instead of using the buildEventsReIndex()
      // const query = buildEventsQuery();

    
    
    // TODO: Turn these options being sent in into a template for the alert type
    const noReIndex = buildEventsScrollQuery({
      index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
      from: moment()
        .subtract(10, 'seconds')
        .valueOf(),
      to: Date.now(),
      signalsIndex: '.siem-signals-10-01-2019',
      severity: 2,
      description: 'User root activity',
      name: 'User Rule',
      timeDetected: Date.now(),
      kqlFilter: {
        bool: {
          should: [
            {
              match_phrase: {
                'user.name': 'root',
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      ruleRevision: 1,
      ruleId: '1',
      ruleType: 'KQL',
      references: ['https://www.elastic.co', 'https://example.com'],
    });

    // const {
    //   description,
    //   filter,
    //   from,
    //   id,
    //   index,
    //   kql,
    //   maxSignals,
    //   name,
    //   references,
    //   severity,
    //   to,
    //   type,
    // } = params;
    // const reIndex = buildEventsReIndex({
    //   index,
    //   from,
    //   kql,
    //   to,
    //   // TODO: Change this out once we have solved
    //   // https://github.com/elastic/kibana/issues/47002
    //   signalsIndex: process.env.SIGNALS_INDEX || '.siem-signals-10-01-2019',
    //   severity,
    //   description,
    //   name,
    //   timeDetected: Date.now(),
    //   filter,
    //   maxDocs: maxSignals,
    //   ruleRevision: 1,
    //   ruleId: '1',
    //   ruleType: 'KQL',
    //   references: ['https://www.elastic.co', 'https://example.com'],
    // });

    const updateByQueryBody = buildUpdateByQuery({
      index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
      signalsIndex: '.siem-signals-10-01-2019',
      severity: 2,
      description: 'User root activity',
      name: 'User Rule',
      timeDetected: Date.now(),
      kqlFilter: {
        bool: {
          should: [
            {
              match_phrase: {
                'user.name': 'root',
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      maxDocs: 100,
      ruleRevision: 1,
      id,
      type,
      references,
    });

    async function getThatBody(
      someResult: SearchResponse<object>,
      concatResult: SearchHit[]
    ): Promise<SearchResponse<object> | SearchHit[]> {
      if (someResult.hits.hits.length === 0) {
        services.log(['info', 'SIEM'], `Returning concatenated result ${concatResult.length}`);
        return concatResult;
      }
      services.log(['info', 'SIEM'], `scrollId: ${someResult._scroll_id}`);
      const resultino = await services.callCluster('scroll', {
        scroll: '30s',
        scrollId: someResult._scroll_id,
      });
      // services.log(['info', 'SIEM'], `resultino.scrollId: ${JSON.stringify(resultino, null, 2)}`);
      return getThatBody(resultino, concatResult.concat(resultino.hits.hits));
    }

    try {
      services.log(['info', 'SIEM'], 'Starting SIEM signal job');

      // TODO: Comment this in eventually and use this for manual insertion of the
      // signals instead of the ReIndex() api
      // const { scrollId, hits } = await services.callCluster('search', noReIndex);
      const noReIndexResult = await services.callCluster('search', noReIndex);
      // services.log(
      //   ['info', 'SIEM'],
      //   `[+] Bulk Query Result: ${JSON.stringify(noReIndexResult, null, 4)}`
      // );
      const bulkQueryBody = await getThatBody(noReIndexResult, []);
      const bulkIndex = noReIndexResult.hits.hits.flatMap((doc: SearchHit) => [
        { index: { _index: '.siem-signals-10-01-2019', _id: doc._id } },
        doc._source,
      ]);
      // services.log(
      //   ['info', 'SIEM'],
      //   `[+] bulkQueryBody: ${JSON.stringify(bulkQueryBody, null, 4)}`
      // );
      const bulkResponse = await services.callCluster('bulk', {
        refresh: true,
        body: bulkIndex,
      });
      if (bulkResponse.errors) {
        services.log(
          ['error', 'SIEM'],
          `[-] bulkResponse had errors: ${JSON.stringify(bulkResponse.errors, null, 2)}}`
        );
      } else {
        services.log(
          ['info', 'SIEM'],
          `Result of bulk Index: ${JSON.stringify(bulkResponse, null, 4)}`
        );
        const updateByQueryResponse = await services.callCluster(
          'updateByQuery',
          updateByQueryBody
        );
        services.log(
          ['info', 'SIEM'],
          `Result of updateByQuery: ${JSON.stringify(updateByQueryResponse, null, 2)}`
        );
      }

      // eslint-disable-next-line
      // const result = await services.callCluster('reindex', reIndex);

      // TODO: Error handling here and writing of any errors that come back from ES by
      // services.log(['info', 'SIEM'], `Result of reindex: ${JSON.stringify(result, null, 2)}`);
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
