/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import {
  UsageCountersSavedObject,
  serializeCounterKey,
} from '@kbn/usage-collection-plugin/server/usage_counters';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  async function getSavedObjectCounters() {
    // wait until ES indexes the counter SavedObject;
    await new Promise((res) => setTimeout(res, 7 * 1000));

    return await supertest
      .get('/api/saved_objects/_find?type=usage-counters')
      .set('kbn-xsrf', 'true')
      .expect(200)
      .then(({ body }) => {
        expect(body.total).to.above(1);
        return (body.saved_objects as UsageCountersSavedObject[]).reduce((acc, savedObj) => {
          const { count, counterName, domainId } = savedObj.attributes;
          if (domainId === 'usageCollectionTestPlugin') {
            acc[counterName] = count;
          }

          return acc;
        }, {} as Record<string, number>);
      });
  }

  describe('Usage Counters service', () => {
    before(async () => {
      const key = serializeCounterKey({
        counterName: 'routeAccessed',
        counterType: 'count',
        domainId: 'usageCollectionTestPlugin',
        date: Date.now(),
      });

      await supertest.delete(`/api/saved_objects/usage-counters/${key}`).set('kbn-xsrf', 'true');
    });

    it('stores usage counters sent during start and setup', async () => {
      const { duringSetup, duringStart, routeAccessed } = await getSavedObjectCounters();

      expect(duringSetup).to.be(11);
      expect(duringStart).to.be(1);
      expect(routeAccessed).to.be(undefined);
    });

    it('stores usage counters triggered by runtime activities', async () => {
      await supertest.get('/api/usage_collection_test_plugin').set('kbn-xsrf', 'true').expect(200);

      const { routeAccessed } = await getSavedObjectCounters();
      expect(routeAccessed).to.be(1);
    });
  });
}
