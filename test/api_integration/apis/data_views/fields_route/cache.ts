/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { INITIAL_REST_VERSION_INTERNAL } from '@kbn/data-views-plugin/server/constants';
import { FIELDS_PATH } from '@kbn/data-views-plugin/common/constants';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('cache headers', () => {
    before(() =>
      esArchiver.load('test/api_integration/fixtures/es_archiver/index_patterns/basic_index')
    );
    after(() =>
      esArchiver.unload('test/api_integration/fixtures/es_archiver/index_patterns/basic_index')
    );

    it('are present', async () => {
      const response = await supertest.get(FIELDS_PATH).query({
        pattern: '*',
        include_unmapped: true,
        apiVersion: INITIAL_REST_VERSION_INTERNAL,
      });

      const cacheControlHeader = response.get('cache-control');

      expect(cacheControlHeader).to.contain('max-age');
      expect(cacheControlHeader).to.contain('stale-while-revalidate');
      expect(response.get('vary')).to.equal('accept-encoding, user-hash');
      expect(response.get('etag')).to.not.be.empty();
      expect(response.get('user-hash')).to.equal('');
    });

    it('returns 304 on matching etag', async () => {
      const response = await supertest.get(FIELDS_PATH).query({
        pattern: '*',
        include_unmapped: true,
        apiVersion: INITIAL_REST_VERSION_INTERNAL,
      });

      await supertest
        .get(FIELDS_PATH)
        .set('If-None-Match', response.get('etag'))
        .query({
          pattern: '*',
          include_unmapped: true,
          apiVersion: INITIAL_REST_VERSION_INTERNAL,
        })
        .expect(304);
    });
  });
}
