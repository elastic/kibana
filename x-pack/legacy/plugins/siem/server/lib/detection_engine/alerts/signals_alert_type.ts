/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { SIGNALS_ID } from '../../../../common/constants';
import { AlertType, AlertExecutorOptions } from '../../../../../alerting';

// TODO: Remove this for the build_events_query call eventually
import { buildEventsReIndex } from './build_events_reindex';

// TODO: Comment this in and use this instead of the reIndex API
// once scrolling and other things are done with it.
// import { buildEventsQuery } from './build_events_query';

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
    }),
  },
  // TODO: Type the params as it is all filled with any
  async executor({ services, params, state }: AlertExecutorOptions) {
    const instance = services.alertInstanceFactory('siem-signals');

    // TODO: Comment this in eventually and use the buildEventsQuery()
    // for scrolling and other fun stuff instead of using the buildEventsReIndex()
    // const query = buildEventsQuery();

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
    } = params;
    const reIndex = buildEventsReIndex({
      index,
      from,
      kql,
      to,
      // TODO: Change this out once we have solved
      // https://github.com/elastic/kibana/issues/47002
      signalsIndex: '.siem-signals-10-01-2019',
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
      services.log(['info', 'SIEM'], 'Starting SIEM signal job');

      // TODO: Comment this in eventually and use this for manual insertion of the
      // signals instead of the ReIndex() api
      // const result = await services.callCluster('search', query);
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
