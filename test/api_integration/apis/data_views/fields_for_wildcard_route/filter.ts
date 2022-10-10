/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('filter fields', () => {
    before(async () => {
      await es.index({
        index: 'helloworld1',
        refresh: true,
        id: 'helloworld',
        body: { hello: 'world' },
      });

      await es.index({
        index: 'helloworld2',
        refresh: true,
        id: 'helloworld2',
        body: { bye: 'world' },
      });
    });

    it('can filter', async () => {
      const a = await supertest
        .put('/api/index_patterns/_fields_for_wildcard')
        .query({ pattern: 'helloworld*' })
        .send({ index_filter: { exists: { field: 'bye' } } });

      const fieldNames = a.body.fields.map((fld: { name: string }) => fld.name);

      expect(fieldNames.indexOf('bye') > -1).to.be(true);
      expect(fieldNames.indexOf('hello') === -1).to.be(true);
    });
  });
}
