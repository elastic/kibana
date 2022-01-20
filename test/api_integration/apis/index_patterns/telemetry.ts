/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCountersSavedObject } from '../../../../src/plugins/usage_collection/server/usage_counters';
import { KibanaSupertestProvider } from '../../services/supertest';

export const getUsageCounters = (supertest: ReturnType<typeof KibanaSupertestProvider>) =>
  supertest
    .get('/api/saved_objects/_find?type=usage-counters')
    .set('kbn-xsrf', 'true')
    .expect(200)
    .then(({ body }) => {
      return (body.saved_objects as UsageCountersSavedObject[]).reduce((acc, savedObj) => {
        const { count, counterName, domainId } = savedObj.attributes;
        if (domainId === 'dataViewsRestApi') {
          acc[counterName] = count;
        }

        return acc;
      }, {} as Record<string, number>);
    });
