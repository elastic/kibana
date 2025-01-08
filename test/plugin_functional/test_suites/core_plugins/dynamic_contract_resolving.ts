/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  describe('Dynamic plugin resolving', function describeIndexTests() {
    it('Plugin A can dynamically resolve plugin B contracts', async () => {
      await supertest
        .get('/api/core_dynamic_resolving_a/test')
        .set('kbn-xsrf', 'anything')
        .send()
        .expect(200)
        .expect({
          setup: 'pluginBSetup',
          start: 'pluginBStart',
        });
    });

    it('Plugin B can dynamically resolve plugin A contracts', async () => {
      await supertest
        .get('/api/core_dynamic_resolving_b/test')
        .set('kbn-xsrf', 'anything')
        .send()
        .expect(200)
        .expect({
          setup: 'pluginASetup',
          start: 'pluginAStart',
        });
    });
  });
}
