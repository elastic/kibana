/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { Response } from 'supertest';
import type { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  describe('GET /api/kibana/management/saved_objects/_allowed_types', () => {
    const URL = '/api/kibana/management/saved_objects/_allowed_types';

    it('should only return types that are `visibleInManagement: true`', async () =>
      await supertest
        .get(URL)
        .set('kbn-xsrf', 'true')
        .expect(200)
        .then((response: Response) => {
          const { types } = response.body;
          expect(types.includes('test-is-exportable')).to.eql(true);
          expect(types.includes('test-visible-in-management')).to.eql(true);
          expect(types.includes('test-not-visible-in-management')).to.eql(false);
        }));
  });
}
