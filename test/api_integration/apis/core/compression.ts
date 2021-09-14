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
  const supertest = getService('supertest');

  describe('compression', () => {
    it(`uses compression when there isn't a referer`, async () => {
      await supertest
        .get('/app/kibana')
        .set('accept-encoding', 'gzip')
        .then((response) => {
          expect(response.header).to.have.property('content-encoding', 'gzip');
        });
    });

    it(`uses compression when there is a whitelisted referer`, async () => {
      await supertest
        .get('/app/kibana')
        .set('accept-encoding', 'gzip')
        .set('referer', 'https://some-host.com')
        .then((response) => {
          expect(response.header).to.have.property('content-encoding', 'gzip');
        });
    });

    it(`doesn't use compression when there is a non-whitelisted referer`, async () => {
      await supertest
        .get('/app/kibana')
        .set('accept-encoding', 'gzip')
        .set('referer', 'https://other.some-host.com')
        .then((response) => {
          expect(response.header).not.to.have.property('content-encoding');
        });
    });
  });
}
