/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  describe('prototype', function () {
    it('does not allow polluting most prototypes', async () => {
      await supertest
        .get('/api/hardening/_pollute_prototypes')
        .set('kbn-xsrf', 'true')
        .expect(200)
        .then((response) => {
          expect(response.body).to.eql({
            object: {
              prototype: {},
              error: 'Cannot add property polluted, object is not extensible',
            },
            number: {
              prototype: {},
              error: 'Cannot add property polluted, object is not extensible',
            },
            string: {
              prototype: {},
              error: 'Cannot add property polluted, object is not extensible',
            },
            fn: {
              prototype: {},
              error: 'Cannot add property polluted, object is not extensible',
            },
            array: {
              prototype: {
                '0': 'polluted',
              },
            },
          });
        });
    });
  });
}
