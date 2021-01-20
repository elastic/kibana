/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { Response } from 'supertest';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('legacyEs');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('get', () => {
    const existingObject = 'visualization/dd7caf20-9efd-11e7-acb3-3dab96693fab';
    const nonexistentObject = 'wigwags/foo';

    describe('with kibana index', () => {
      before(() => esArchiver.load('saved_objects/basic'));
      after(() => esArchiver.unload('saved_objects/basic'));

      it('should return 200 for object that exists and inject metadata', async () =>
        await supertest
          .get(`/api/kibana/management/saved_objects/${existingObject}`)
          .expect(200)
          .then((resp: Response) => {
            const { body } = resp;
            const { type, id, meta } = body;
            expect(type).to.eql('visualization');
            expect(id).to.eql('dd7caf20-9efd-11e7-acb3-3dab96693fab');
            expect(meta).to.not.equal(undefined);
          }));

      it('should return 404 for object that does not exist', async () =>
        await supertest
          .get(`/api/kibana/management/saved_objects/${nonexistentObject}`)
          .expect(404));
    });

    describe('without kibana index', () => {
      before(
        async () =>
          // just in case the kibana server has recreated it
          await es.indices.delete({
            index: '.kibana',
            ignore: [404],
          })
      );

      it('should return 404 for object that no longer exists', async () =>
        await supertest.get(`/api/kibana/management/saved_objects/${existingObject}`).expect(404));
    });
  });
}
