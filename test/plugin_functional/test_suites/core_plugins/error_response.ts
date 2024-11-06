/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import '@kbn/core-provider-plugin/types';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  // routes defined in the `core_http` test plugin
  describe('Custom errors', () => {
    it('can serve an error response from stream', async () => {
      await supertest
        .get('/api/core_http/error_stream')
        .expect(501)
        .then((response) => {
          const res = response.body.toString();
          expect(res).to.eql('error stream');
        });
    });

    it('can serve an error response from buffer', async () => {
      await supertest
        .get('/api/core_http/error_buffer')
        .expect(501)
        .then((response) => {
          const res = response.body.toString();
          expect(res).to.eql('error buffer');
        });
    });
  });
}
