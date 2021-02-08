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
  const esArchiver = getService('esArchiver');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  describe('delete', () => {
    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/basic'));
      after(() => esArchiver.unload('saved_objects/basic'));

      it('should return 200 when deleting a doc', async () =>
        await supertest
          .delete(`/api/saved_objects/dashboard/be3733a0-9efe-11e7-acb3-3dab96693fab`)
          .expect(200)
          .then((resp) => {
            expect(resp.body).to.eql({});
          }));

      it('should return generic 404 when deleting an unknown doc', async () =>
        await supertest
          .delete(`/api/saved_objects/dashboard/not-a-real-id`)
          .expect(404)
          .then((resp) => {
            expect(resp.body).to.eql({
              statusCode: 404,
              error: 'Not Found',
              message: 'Saved object [dashboard/not-a-real-id] not found',
            });
          }));
    });

    describe('without kibana index', () => {
      before(
        async () =>
          // just in case the kibana server has recreated it
          await esDeleteAllIndices('.kibana*')
      );

      it('returns generic 404 when kibana index is missing', async () =>
        await supertest
          .delete(`/api/saved_objects/dashboard/be3733a0-9efe-11e7-acb3-3dab96693fab`)
          .expect(404)
          .then((resp) => {
            expect(resp.body).to.eql({
              statusCode: 404,
              error: 'Not Found',
              message: 'Saved object [dashboard/be3733a0-9efe-11e7-acb3-3dab96693fab] not found',
            });
          }));
    });
  });
}
