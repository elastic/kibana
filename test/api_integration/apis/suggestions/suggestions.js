/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export default function ({ getService }) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');

  describe('Suggestions API', function () {
    before(async () => {
      await esArchiver.load('test/api_integration/fixtures/es_archiver/index_patterns/basic_index');
      await kibanaServer.importExport.load(
        'test/api_integration/fixtures/kbn_archiver/index_patterns/basic_kibana.json'
      );
    });
    after(async () => {
      await esArchiver.unload(
        'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
      );
      await kibanaServer.importExport.unload(
        'test/api_integration/fixtures/kbn_archiver/index_patterns/basic_kibana.json'
      );
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
