/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../functional/ftr_provider_context';
import '@kbn/analytics-ftr-helpers-plugin/public/types';

export function KibanaEBTServerProvider({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const setOptIn = async (optIn: boolean) => {
    await supertest
      .post(`/internal/analytics_ftr_helpers/opt_in`)
      .set('kbn-xsrf', 'xxx')
      .query({ consent: optIn })
      .expect(200);
  };

  return {
    /**
     * Change the opt-in state of the Kibana EBT client.
     * @param optIn `true` to opt-in, `false` to opt-out.
     */
    setOptIn,
    /**
     * Returns the last events of the specified types.
     * @param takeNumberOfEvents - number of events to return
     * @param eventTypes (Optional) array of event types to return
     */
    getEvents: async (takeNumberOfEvents: number, eventTypes: string[] = []) => {
      await setOptIn(true);
      const resp = await supertest
        .get(`/internal/analytics_ftr_helpers/events`)
        .query({ takeNumberOfEvents, eventTypes: JSON.stringify(eventTypes) })
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      return resp.body;
    },
  };
}

export function KibanaEBTUIProvider({ getService, getPageObjects }: FtrProviderContext) {
  const { common } = getPageObjects(['common']);
  const browser = getService('browser');

  const setOptIn = async (optIn: boolean) => {
    await browser.execute((isOptIn) => window.__analytics_ftr_helpers__.setOptIn(isOptIn), optIn);
  };

  return {
    /**
     * Change the opt-in state of the Kibana EBT client.
     * @param optIn `true` to opt-in, `false` to opt-out.
     */
    setOptIn: async (optIn: boolean) => {
      await common.navigateToApp('home');
      await setOptIn(optIn);
    },
    /**
     * Returns the last events of the specified types.
     * @param numberOfEvents - number of events to return
     * @param eventTypes (Optional) array of event types to return
     */
    getEvents: async (numberOfEvents: number, eventTypes: string[] = []) => {
      await setOptIn(true);
      const events = await browser.execute(
        ({ eventTypes: _eventTypes, numberOfEvents: _numberOfEvents }) =>
          window.__analytics_ftr_helpers__.getEvents(_numberOfEvents, _eventTypes),
        {
          eventTypes,
          numberOfEvents,
        }
      );
      return events;
    },
  };
}
