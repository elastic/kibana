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
  const kibanaServer = getService('kibanaServer');

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

      expect(cacheControlHeader).to.contain('private');
      expect(cacheControlHeader).to.contain('max-age');
      expect(cacheControlHeader).to.contain('stale-while-revalidate');
      expect(response.get('vary')).to.equal('accept-encoding, user-hash');
      expect(response.get('etag')).to.not.be.empty();
    });

    it('no-cache when data_views:cache_max_age set to zero', async () => {
      await kibanaServer.uiSettings.update({ 'data_views:cache_max_age': 0 });

      const response = await supertest.get(FIELDS_PATH).query({
        pattern: 'b*',
        include_unmapped: true,
        apiVersion: INITIAL_REST_VERSION_INTERNAL,
      });

      const cacheControlHeader = response.get('cache-control');

      expect(cacheControlHeader).to.contain('private');
      expect(cacheControlHeader).to.contain('no-cache');
      expect(cacheControlHeader).to.not.contain('max-age');
      expect(cacheControlHeader).to.not.contain('stale-while-revalidate');
      expect(response.get('vary')).to.equal('accept-encoding, user-hash');
      expect(response.get('etag')).to.not.be.empty();

      await kibanaServer.uiSettings.replace({ 'data_views:cache_max_age': 5 });
    });

    it('returns 304 on matching etag', async () => {
      const response = await supertest.get(FIELDS_PATH).query({
        pattern: '*',
        include_unmapped: true,
        apiVersion: INITIAL_REST_VERSION_INTERNAL,
      });

      await supertest
        .get(FIELDS_PATH)
        .set('If-None-Match', response.get('etag')!)
        .query({
          pattern: '*',
          include_unmapped: true,
          apiVersion: INITIAL_REST_VERSION_INTERNAL,
        })
        .expect(304);
    });

    it('handles empty field lists', async () => {
      const response = await supertest.get(FIELDS_PATH).query({
        pattern: 'xyz',
        include_unmapped: true,
        apiVersion: INITIAL_REST_VERSION_INTERNAL,
        allow_no_index: true,
      });

      expect(response.body.fields).to.be.empty();
    });
  });
}
