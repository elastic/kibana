/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  describe('data view rest api telemetry', () => {
    it('reports usageCollection', async () => {
      const supertest = getService('supertest');
      const result = await supertest.get('/api/stats?extended=true&legacy=true');
      const events = result.body.usage.usage_counters.daily_events as Array<{ domainId: string }>;
      const filteredEvents = events.filter(({ domainId }) => domainId === 'dataViewsRestApi');
      expect(filteredEvents.length).to.equal(3);
    });
  });
}
