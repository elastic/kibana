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

  describe('POST /api/console/proxy', () => {
    describe('system indices behavior', () => {
      it('returns warning header when making requests to .kibana index', async () => {
        return await supertest
          .post('/api/console/proxy?method=GET&path=/.kibana/_settings')
          .set('kbn-xsrf', 'true')
          .then((response) => {
            expect(response.header).to.have.property('warning');
            const { warning } = response.header as { warning: string };
            expect(warning.startsWith('299')).to.be(true);
            expect(warning.includes('system indices')).to.be(true);
          });
      });

      it('does not forward x-elastic-product-origin', async () => {
        // If we pass the header and we still get the warning back, we assume that the header was not forwarded.
        return await supertest
          .post('/api/console/proxy?method=GET&path=/.kibana/_settings')
          .set('kbn-xsrf', 'true')
          .set('x-elastic-product-origin', 'kibana')
          .then((response) => {
            expect(response.header).to.have.property('warning');
            const { warning } = response.header as { warning: string };
            expect(warning.startsWith('299')).to.be(true);
            expect(warning.includes('system indices')).to.be(true);
          });
      });
    });
  });
}
