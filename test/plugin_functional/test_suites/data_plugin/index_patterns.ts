/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';
import '@kbn/core-provider-plugin/types';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('index patterns', function () {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
    });
    let indexPatternId = '';

    it('can create an index pattern', async () => {
      const title = 'shakes*';
      const fieldFormats = { bytes: { id: 'bytes' } };
      const body = await (
        await supertest
          .post('/api/index-patterns-plugin/create')
          .set('kbn-xsrf', 'anything')
          .send({ title, fieldFormats })
          .expect(200)
      ).body;

      indexPatternId = body.id;
      expect(body.id).not.empty();
      expect(body.title).to.equal(title);
      expect(body.fields.length).to.equal(15);
      expect(body.fieldFormatMap).to.eql(fieldFormats);
    });

    it('can get index pattern by id', async () => {
      const body = await (
        await supertest.get(`/api/index-patterns-plugin/get/${indexPatternId}`).expect(200)
      ).body;
      expect(typeof body.id).to.equal('string');
    });

    it('can update index pattern', async () => {
      const resp = await supertest
        .get(`/api/index-patterns-plugin/update/${indexPatternId}`)
        .expect(200);
      expect(resp.body).to.eql({});
    });

    it('can delete index pattern', async () => {
      await supertest.get(`/api/index-patterns-plugin/delete/${indexPatternId}`).expect(200);
    });
  });
}
