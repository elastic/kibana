/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import {
  MAIN_SAVED_OBJECT_INDEX,
  ANALYTICS_SAVED_OBJECT_INDEX,
} from '@kbn/core-saved-objects-server';
import type { FtrProviderContext } from '../../ftr_provider_context';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('/deprecations/_delete_unknown_types', () => {
    before(async () => {
      // we are injecting unknown types in this archive, so we need to relax the mappings restrictions
      await es.indices.putMapping({ index: MAIN_SAVED_OBJECT_INDEX, dynamic: true });
      await esArchiver.load(
        'test/api_integration/fixtures/es_archiver/saved_objects/delete_unknown_types'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'test/api_integration/fixtures/es_archiver/saved_objects/delete_unknown_types'
      );
    });

    const fetchIndexContent = async () => {
      const body = await es.search<{ type: string }>({
        index: [MAIN_SAVED_OBJECT_INDEX, ANALYTICS_SAVED_OBJECT_INDEX],
        body: {
          size: 100,
        },
      });
      return body.hits.hits
        .map((hit) => ({
          type: hit._source!.type,
          id: hit._id,
        }))
        .sort((a, b) => {
          return a.id > b.id ? 1 : -1;
        });
    };

    it('should return 200 with individual responses', async () => {
      const beforeDelete = await fetchIndexContent();
      const beforeDeleteIds = beforeDelete.map((obj) => obj.id);
      [
        'dashboard:b70c7ae0-3224-11e8-a572-ffca06da1357',
        'index-pattern:8963ca30-3224-11e8-a572-ffca06da1357',
        'search:960372e0-3224-11e8-a572-ffca06da1357',
        'space:default',
        'unknown-shareable-doc',
        'unknown-type:unknown-doc',
        'visualization:a42c0580-3224-11e8-a572-ffca06da1357',
      ].forEach((id) => {
        expect(beforeDeleteIds).to.contain(id);
      });

      await supertest
        .post(`/internal/saved_objects/deprecations/_delete_unknown_types`)
        .send({})
        .set('kbn-xsrf', 'true')
        .expect(200)
        .then((resp) => {
          expect(resp.body).to.eql({ success: true });
        });

      for (let i = 0; i < 10; i++) {
        const afterDelete = await fetchIndexContent();
        // we're deleting with `wait_for_completion: false` and we don't surface
        // the task ID in the API, so we're forced to use pooling for the FTR tests
        if (afterDelete.map((obj) => obj.type).includes('unknown-type') && i < 10) {
          await delay(1000);
          continue;
        }
        const afterDeleteIds = afterDelete.map((obj) => obj.id);
        [
          'dashboard:b70c7ae0-3224-11e8-a572-ffca06da1357',
          'index-pattern:8963ca30-3224-11e8-a572-ffca06da1357',
          'search:960372e0-3224-11e8-a572-ffca06da1357',
          'space:default',
          'visualization:a42c0580-3224-11e8-a572-ffca06da1357',
        ].forEach((id) => expect(afterDeleteIds).to.contain(id));

        break;
      }
    });
  });
}
