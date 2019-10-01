/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { APP_ID } from '../../../../common/constants';
import { AlertType, AlertExecutorOptions } from '../../../../../alerting';

// TODO: Remove this for the build_events_query call eventually
import { buildEventsReIndex } from './build_events_reindex';

// TODO: Comment this in and use this instead of the reIndex API
// once scrolling and other things are done with it.
// import { buildEventsQuery } from './build_events_query';

export const signalsAlertType: AlertType = {
  id: `${APP_ID}.signals`,
  name: 'SIEM Signals',
  actionGroups: ['default'],
  async executor({ services, params, state }: AlertExecutorOptions) {
    // TODO: We need to swap out this arbitrary number of siem-signal id for an injected
    // data driven instance id through passed in parameters.
    const instance = services.alertInstanceFactory('siem-signals');

    // TODO: Comment this in eventually and use the buildEventsQuery()
    // for scrolling and other fun stuff instead of using the buildEventsReIndex()
    // const query = buildEventsQuery();

    // TODO: Turn these options being sent in into a template for the alert type
    const reIndex = buildEventsReIndex({
      index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
      from: moment()
        .subtract(5, 'minutes')
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
      maxDocs: 100,
      ruleRevision: 1,
      ruleId: '1',
      ruleType: 'KQL',
      references: ['https://www.elastic.co', 'https://example.com'],
    });

    try {
      services.log(['info', 'SIEM'], 'Starting SIEM signal job');

      // TODO: Comment this in eventually and use this for manual insertion of the
      // signals instead of the ReIndex() api
      // const result = await services.callCluster('search', query);
      // eslint-disable-next-line
      const result = await services.callCluster('reindex', reIndex);

      // TODO: Error handling here and writing of any errors that come back from ES by
      services.log(['info', 'SIEM'], `Result of reindex: ${JSON.stringify(result, null, 2)}`);
    } catch (err) {
      // TODO: Error handling and writing of errors into a signal that has error
      // handling/conditions
      services.log(['error', 'SIEM'], `You encountered an error of: ${err.message}`);
    }

    // Schedule the default action which is nothing if it's a plain signal.
    instance.scheduleActions('default');
  },
};
