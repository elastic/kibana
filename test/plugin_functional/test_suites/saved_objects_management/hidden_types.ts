/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('TOTO saved objects management with hidden types', () => {
    before(async () => {
      await esArchiver.load(
        '../functional/fixtures/es_archiver/saved_objects_management/hidden_types'
      );
    });

    after(async () => {
      await esArchiver.unload(
        '../functional/fixtures/es_archiver/saved_objects_management/hidden_types'
      );
    });

    it('should flag the object as hidden in its meta', async () => {
      await supertest
        .get('/api/kibana/management/saved_objects/_find?type=test-actions-export-hidden')
        .set('kbn-xsrf', 'true')
        .expect(200)
        .then((resp) => {
          expect(
            resp.body.saved_objects.map((obj: any) => ({
              id: obj.id,
              type: obj.type,
              hidden: obj.meta.hiddenType,
            }))
          ).to.eql([
            {
              id: 'obj_1',
              type: 'test-actions-export-hidden',
              hidden: true,
            },
            {
              id: 'obj_2',
              type: 'test-actions-export-hidden',
              hidden: true,
            },
          ]);
        });
    });
  });
}
