/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SuperTest, Test } from 'supertest';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const defaultTypes = ['visualization', 'index-pattern', 'search', 'dashboard'];

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest') as SuperTest<Test>;
  const kibanaServer = getService('kibanaServer');
  const SPACE_ID = 'ftr-so-mgmt-scroll-count';
  const apiUrl = `/s/${SPACE_ID}/api/kibana/management/saved_objects/scroll/counts`;

  describe('scroll_count', () => {
    before(async () => {
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_ID });
      await kibanaServer.importExport.load('management/saved_objects/scroll_count', {
        space: SPACE_ID,
      });
    });
    after(async () => {
      await kibanaServer.importExport.unload('management/saved_objects/scroll_count', {
        space: SPACE_ID,
      });
      await kibanaServer.spaces.delete(SPACE_ID);
    });

    it('returns the count for each included types', async () => {
      const res = await supertest
        .post(apiUrl)
        .send({
          typesToInclude: defaultTypes,
        })
        .expect(200);

      expect(res.body).to.eql({
        dashboard: 2,
        'index-pattern': 1,
        search: 1,
        visualization: 2,
      });
    });

    it('only returns count for types to include', async () => {
      const res = await supertest
        .post(apiUrl)
        .send({
          typesToInclude: ['dashboard', 'search'],
        })
        .expect(200);

      expect(res.body).to.eql({
        dashboard: 2,
        search: 1,
      });
    });

    it('filters on title when `searchString` is provided', async () => {
      const res = await supertest
        .post(apiUrl)
        .send({
          typesToInclude: defaultTypes,
          searchString: 'Amazing',
        })
        .expect(200);

      expect(res.body).to.eql({
        dashboard: 1,
        visualization: 1,
        'index-pattern': 0,
        search: 0,
      });
    });

    it('includes all requested types even when none match the search', async () => {
      const res = await supertest
        .post(apiUrl)
        .send({
          typesToInclude: ['dashboard', 'search', 'visualization'],
          searchString: 'nothing-will-match',
        })
        .expect(200);

      expect(res.body).to.eql({
        dashboard: 0,
        visualization: 0,
        search: 0,
      });
    });
  });
}
