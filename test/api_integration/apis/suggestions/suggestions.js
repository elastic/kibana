/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('Suggestions API', function () {
    before(async () => {
      await esArchiver.load('index_patterns/basic_index');
      await esArchiver.load('index_patterns/basic_kibana');
    });
    after(async () => {
      await esArchiver.unload('index_patterns/basic_index');
      await esArchiver.unload('index_patterns/basic_kibana');
    });

    it('should return 200 with special characters', () =>
      supertest
        .post('/api/kibana/suggestions/values/basic_index')
        .send({
          field: 'baz.keyword',
          query: '<something?with:lots&of^ bad characters',
        })
        .expect(200));

    it('should support nested fields', () =>
      supertest
        .post('/api/kibana/suggestions/values/basic_index')
        .send({
          field: 'nestedField.child',
          query: 'nes',
        })
        .expect(200, ['nestedValue']));
  });
}
