/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SuperTest, Test } from 'supertest';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const apiUrl = '/api/kibana/management/saved_objects/scroll/counts';
const defaultTypes = ['visualization', 'index-pattern', 'search', 'dashboard'];

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest') as SuperTest<Test>;
  const esArchiver = getService('esArchiver');

  describe('scroll_count', () => {
    before(async () => {
      await esArchiver.load('management/saved_objects/scroll_count');
    });
    after(async () => {
      await esArchiver.unload('management/saved_objects/scroll_count');
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
