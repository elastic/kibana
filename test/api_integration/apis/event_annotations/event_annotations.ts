/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type {
  EventAnnotationGroupSavedObjectAttributes,
  EventAnnotationGroupCreateIn,
  EventAnnotationGroupUpdateIn,
  EventAnnotationGroupSearchIn,
  EventAnnotationGroupGetIn,
  EventAnnotationGroupGetOut,
} from '@kbn/event-annotation-plugin/common';
import { CONTENT_ID } from '@kbn/event-annotation-plugin/common';
import { FtrProviderContext } from '../../ftr_provider_context';

const CONTENT_ENDPOINT = '/api/content_management/rpc';

const API_VERSION = 1;

const EXISTING_ID_1 = '46c2a460-4e77-11ee-bb97-116581699678'; // from loaded archive
const EXISTING_ID_2 = '425d2760-4e77-11ee-bb97-116581699678'; // from loaded archive
const EXISTING_ID_3 = '3905a4d0-4e77-11ee-bb97-116581699678'; // from loaded archive

const DEFAULT_EVENT_ANNOTATION_GROUP: EventAnnotationGroupSavedObjectAttributes = {
  title: 'a group',
  description: '',
  ignoreGlobalFilters: true,
  dataViewSpec: null,
  annotations: [
    {
      label: 'Event',
      type: 'manual',
      key: {
        type: 'point_in_time',
        timestamp: '2023-08-10T15:00:00.000Z',
      },
      icon: 'triangle',
      id: '499ee351-f541-46e0-b327-b3dcae91aff5',
    },
  ],
};

const DEFAULT_REFERENCES = [
  {
    type: 'index-pattern',
    id: '90943e30-9a47-11e8-b64d-95841ca0b247',
    name: 'event-annotation-group_dataView-ref-90943e30-9a47-11e8-b64d-95841ca0b247',
  },
];

export default function ({ getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');

  describe('group API', () => {
    before(async () => {
      await kibanaServer.importExport.load(
        'test/api_integration/fixtures/kbn_archiver/event_annotations/event_annotations.json'
      );
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'test/api_integration/fixtures/kbn_archiver/event_annotations/event_annotations.json'
      );
    });

    describe('get', () => {
      it(`should retrieve an existing group`, async () => {
        const payload: EventAnnotationGroupGetIn = {
          contentTypeId: CONTENT_ID,
          id: EXISTING_ID_1,
          version: API_VERSION,
        };

        const resp = await supertest
          .post(`${CONTENT_ENDPOINT}/get`)
          .set('kbn-xsrf', 'kibana')
          .send(payload)
          .expect(200);

        const result = resp.body.result.result as EventAnnotationGroupGetOut;

        expect(result.item.id).to.be(EXISTING_ID_1);
        expect(result.meta.outcome).to.be('exactMatch');
        expect(result.item.references.length).to.be(1);
        expect(result.item.attributes).to.eql({
          annotations: [
            {
              filter: {
                language: 'kuery',
                query:
                  'agent.keyword : "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)" ',
                type: 'kibana_query',
              },
              icon: 'triangle',
              id: 'fdede168-eff1-400f-b106-0f62061f5099',
              key: {
                type: 'point_in_time',
              },
              label: 'Event',
              timeField: 'timestamp',
              type: 'query',
            },
          ],
          dataViewSpec: null,
          description: '',
          ignoreGlobalFilters: true,
          title: 'group3',
        });
      });

      it(`should reject a group that does not exist`, async () => {
        const payload: EventAnnotationGroupGetIn = {
          contentTypeId: CONTENT_ID,
          id: 'does-not-exist',
          version: API_VERSION,
        };

        const resp = await supertest
          .post(`${CONTENT_ENDPOINT}/get`)
          .set('kbn-xsrf', 'kibana')
          .send(payload)
          .expect(404);

        expect(resp.body).to.eql({
          error: 'Not Found',
          message: 'Saved object [event-annotation-group/does-not-exist] not found',
          statusCode: 404,
        });
      });
    });

    describe('search', () => {
      // TODO test tag searching, ordering, pagination, etc

      it(`should retrieve existing groups`, async () => {
        const payload: EventAnnotationGroupSearchIn = {
          contentTypeId: CONTENT_ID,
          query: {
            limit: 1000,
            tags: {
              included: [],
              excluded: [],
            },
          },
          version: API_VERSION,
        };

        const resp = await supertest
          .post(`${CONTENT_ENDPOINT}/search`)
          .set('kbn-xsrf', 'kibana')
          .send(payload)
          .expect(200);

        const results = resp.body.result.result.hits;
        expect(results.length).to.be(2);
        expect(results.map(({ id }: { id: string }) => id)).to.eql([EXISTING_ID_2, EXISTING_ID_1]);
      });

      it(`should filter by tag`, async () => {});

      it(`should filter by text`, async () => {});

      it(`should paginate`, async () => {});
    });

    describe('delete', () => {
      it(`should delete a group`, async () => {});

      it(`should reject deleting a group that does not exist`, async () => {});
    });

    describe('create', () => {
      it(`should create a new group`, async () => {});

      it(`should reject malformed groups`, async () => {});

      it(`should require dataViewSpec to be specified`, async () => {
        const createWithDataViewSpec = (dataViewSpec: any) => {
          const payload: EventAnnotationGroupCreateIn = {
            contentTypeId: CONTENT_ID,
            data: { ...DEFAULT_EVENT_ANNOTATION_GROUP, dataViewSpec },
            options: {
              references: DEFAULT_REFERENCES,
            },
            version: API_VERSION,
          };
          return supertest
            .post(`${CONTENT_ENDPOINT}/create`)
            .set('kbn-xsrf', 'kibana')
            .send(payload);
        };

        const errorResp = await createWithDataViewSpec(undefined).expect(400);

        expect(errorResp.body.message).to.be(
          'Invalid data. [dataViewSpec]: expected at least one defined value but got [undefined]'
        );

        await createWithDataViewSpec(null).expect(200);

        await createWithDataViewSpec({
          someDataViewProp: 'some-value',
        }).expect(200);
      });
    });

    describe('update', () => {
      it(`should update a group`, async () => {});

      it(`should reject malformed groups`, async () => {});

      it(`should require dataViewSpec to be specified`, async () => {
        const updateWithDataViewSpec = (dataViewSpec: any) => {
          const payload: EventAnnotationGroupUpdateIn = {
            contentTypeId: CONTENT_ID,
            data: { ...DEFAULT_EVENT_ANNOTATION_GROUP, dataViewSpec },
            id: EXISTING_ID_1,
            options: {
              references: DEFAULT_REFERENCES,
            },
            version: API_VERSION,
          };

          return supertest
            .post(`${CONTENT_ENDPOINT}/update`)
            .set('kbn-xsrf', 'kibana')
            .send(payload);
        };
        const errorResp = await updateWithDataViewSpec(undefined).expect(400);

        expect(errorResp.body.message).to.be(
          'Invalid data. [dataViewSpec]: expected at least one defined value but got [undefined]'
        );

        await updateWithDataViewSpec(null).expect(200);

        await updateWithDataViewSpec({
          someDataViewProp: 'some-value',
        }).expect(200);
      });
    });
  });
}
