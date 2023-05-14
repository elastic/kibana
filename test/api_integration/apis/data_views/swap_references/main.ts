/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import {
  DATA_VIEW_SWAP_REFERENCES_PATH,
  SPECIFIC_DATA_VIEW_PATH,
  DATA_VIEW_PATH,
} from '@kbn/data-views-plugin/server';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const title = 'logs-*';
  const prevDataViewId = '91200a00-9efd-11e7-acb3-3dab96693fab';
  let dataViewId = '';

  describe('main', () => {
    const kibanaServer = getService('kibanaServer');
    describe('can preview', () => {
      before(async () => {
        const result = await supertest.post(DATA_VIEW_PATH).send({ data_view: { title } });
        dataViewId = result.body.data_view.id;
      });
      after(async () => {
        await supertest.delete(SPECIFIC_DATA_VIEW_PATH.replace('{id}', dataViewId));
      });
      beforeEach(async () => {
        await kibanaServer.importExport.load(
          'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
        );
      });
      afterEach(async () => {
        await kibanaServer.importExport.unload(
          'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json'
        );
      });

      it('can preview', async () => {
        const res = await supertest.post(DATA_VIEW_SWAP_REFERENCES_PATH).send({
          from_id: prevDataViewId,
          to: dataViewId,
        });
        expect(res).to.have.property('status', 200);
      });

      it('can preview specifying type', async () => {
        const res = await supertest.post(DATA_VIEW_SWAP_REFERENCES_PATH).send({
          from_id: prevDataViewId,
          from_type: 'index-pattern',
          to: dataViewId,
        });
        expect(res).to.have.property('status', 200);
      });

      it('can save changes', async () => {
        const res = await supertest.post(DATA_VIEW_SWAP_REFERENCES_PATH).send({
          from_id: prevDataViewId,
          to: dataViewId,
          preview: false,
        });
        expect(res).to.have.property('status', 200);

        const res2 = await supertest.post(DATA_VIEW_SWAP_REFERENCES_PATH).send({
          from_id: dataViewId,
          to: dataViewId,
        });

        expect(res2.body.result.length).to.equal(1);
      });

      it('can save changes and remove old saved object', async () => {
        const res = await supertest.post(DATA_VIEW_SWAP_REFERENCES_PATH).send({
          from_id: prevDataViewId,
          to: dataViewId,
          preview: false,
          delete: true,
        });
        expect(res).to.have.property('status', 200);

        const res2 = await supertest.get(SPECIFIC_DATA_VIEW_PATH.replace('{id}', prevDataViewId));

        expect(res2).to.have.property('statusCode', 404);
      });

      // todo test limit by type, id
    });
  });
}
