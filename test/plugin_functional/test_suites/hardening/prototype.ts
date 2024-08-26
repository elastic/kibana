/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const snapshots = getService('snapshots');

  describe('prototype', function () {
    it('does not allow polluting most prototypes', async () => {
      const response = await supertest
        .get('/api/hardening/_pollute_prototypes')
        .set('kbn-xsrf', 'true')
        .expect(200);

      await snapshots.compareAgainstBaseline('hardening/prototype', response.body);
    });
  });
}
