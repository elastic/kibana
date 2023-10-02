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
  EventAnnotationGroupCreateOut,
  EventAnnotationGroupUpdateIn,
  EventAnnotationGroupSearchIn,
  EventAnnotationGroupSearchOut,
  EventAnnotationGroupGetIn,
  EventAnnotationGroupGetOut,
  EventAnnotationGroupDeleteIn,
  EventAnnotationGroupDeleteOut,
} from '@kbn/event-annotation-plugin/common';
import { CONTENT_ID } from '@kbn/event-annotation-plugin/common';
import { EVENT_ANNOTATION_GROUP_TYPE } from '@kbn/event-annotation-common';
import { FtrProviderContext } from '../../ftr_provider_context';

const CONTENT_ENDPOINT = '/api/content_management/rpc';

const API_VERSION = 1;

// IDs come from from loaded archive
const EXISTING_ID_1 = '46c2a460-4e77-11ee-bb97-116581699678';
const EXISTING_ID_2 = '425d2760-4e77-11ee-bb97-116581699678';
const DESCRIPTION_2 = 'i am a description you can search for!';
const EXISTING_ID_3 = '3905a4d0-4e77-11ee-bb97-116581699678';
const TAG_ID = '36a8f020-4e77-11ee-bb97-116581699678';

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
      await kibanaServer.savedObjects.clean({ types: [EVENT_ANNOTATION_GROUP_TYPE] });

      await kibanaServer.importExport.load(
        'test/api_integration/fixtures/kbn_archiver/event_annotations/event_annotations.json'
      );
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'test/api_integration/fixtures/kbn_archiver/event_annotations/event_annotations.json'
      );

      await kibanaServer.savedObjects.clean({ types: [EVENT_ANNOTATION_GROUP_TYPE] });
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
      const performSearch = (payload: EventAnnotationGroupSearchIn) =>
        supertest.post(`${CONTENT_ENDPOINT}/search`).set('kbn-xsrf', 'kibana').send(payload);

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

        const resp = await performSearch(payload).expect(200);

        const results = resp.body.result.result.hits;
        expect(results.length).to.be(3);
        expect(results.map(({ id }: { id: string }) => id)).to.eql([
          EXISTING_ID_1,
          EXISTING_ID_2,
          EXISTING_ID_3,
        ]);
      });

      it(`should filter by tag`, async () => {
        const payload: EventAnnotationGroupSearchIn = {
          contentTypeId: CONTENT_ID,
          query: {
            limit: 1000,
            tags: {
              included: [TAG_ID],
              excluded: [],
            },
          },
          version: API_VERSION,
        };

        const resp = await performSearch(payload).expect(200);

        const result = resp.body.result.result as EventAnnotationGroupSearchOut;
        expect(result.hits.length).to.be(2);
        expect(
          result.hits.every(({ references }) => references.map(({ id }) => id).includes(TAG_ID))
        ).to.be(true);
      });

      it(`should filter by text`, async () => {
        const payload: EventAnnotationGroupSearchIn = {
          contentTypeId: CONTENT_ID,
          query: {
            limit: 1000,
            text: DESCRIPTION_2,
            tags: {
              included: [],
              excluded: [],
            },
          },
          version: API_VERSION,
        };

        const resp = await performSearch(payload).expect(200);

        const result = resp.body.result.result as EventAnnotationGroupSearchOut;
        expect(result.hits.length).to.be(1);
        expect(result.hits[0].id).to.be(EXISTING_ID_2);
      });

      it(`should paginate`, async () => {
        const payload: EventAnnotationGroupSearchIn = {
          contentTypeId: CONTENT_ID,
          query: {
            limit: 1,
            cursor: '1',
            tags: {
              included: [],
              excluded: [],
            },
          },
          version: API_VERSION,
        };

        const resp = await performSearch(payload).expect(200);

        const result = resp.body.result.result as EventAnnotationGroupSearchOut;
        expect(result.hits.length).to.be(1);
        expect(result.hits[0].id).to.be(EXISTING_ID_1);
        expect(result.pagination.total).to.be(3);

        // get second page
        payload.query.cursor = '2';

        const resp2 = await performSearch(payload).expect(200);

        const result2 = resp2.body.result.result as EventAnnotationGroupSearchOut;
        expect(result2.hits.length).to.be(1);
        expect(result2.hits[0].id).to.be(EXISTING_ID_2);
        expect(result2.pagination.total).to.be(3);

        // get third page
        payload.query.cursor = '3';

        const resp3 = await performSearch(payload).expect(200);

        const result3 = resp3.body.result.result as EventAnnotationGroupSearchOut;
        expect(result3.hits.length).to.be(1);
        expect(result3.hits[0].id).to.be(EXISTING_ID_3);
        expect(result3.pagination.total).to.be(3);
      });
    });

    describe('create', () => {
      it(`should create a new group`, async () => {
        const payload: EventAnnotationGroupCreateIn = {
          contentTypeId: CONTENT_ID,
          data: DEFAULT_EVENT_ANNOTATION_GROUP,
          options: {
            references: DEFAULT_REFERENCES,
          },
          version: API_VERSION,
        };

        const resp = await supertest
          .post(`${CONTENT_ENDPOINT}/create`)
          .set('kbn-xsrf', 'kibana')
          .send(payload)
          .expect(200);

        const result = resp.body.result.result as EventAnnotationGroupCreateOut;

        expect(result.item.attributes).to.eql(DEFAULT_EVENT_ANNOTATION_GROUP);
        expect(result.item.id).to.be.a('string');
        expect(result.item.namespaces).to.eql(['default']);
      });

      it(`should reject malformed groups`, async () => {
        const badGroups = [
          // extra property
          {
            ...DEFAULT_EVENT_ANNOTATION_GROUP,
            extraProp: 'some-value',
          },
          // missing title
          {
            ...DEFAULT_EVENT_ANNOTATION_GROUP,
            title: undefined,
          },
          // wrong type for property
          {
            ...DEFAULT_EVENT_ANNOTATION_GROUP,
            ignoreGlobalFilters: 'not-a-boolean',
          },
        ] as unknown as EventAnnotationGroupSavedObjectAttributes[]; // (coerce the types because these are intentionally malformed)

        const expectedMessages = [
          'Invalid data. [extraProp]: definition for this key is missing',
          'Invalid data. [title]: expected value of type [string] but got [undefined]',
          'Invalid data. [ignoreGlobalFilters]: expected value of type [boolean] but got [string]',
        ];

        for (let i = 0; i < badGroups.length; i++) {
          const payload: EventAnnotationGroupCreateIn = {
            contentTypeId: CONTENT_ID,
            data: badGroups[i],
            options: {
              references: DEFAULT_REFERENCES,
            },
            version: API_VERSION,
          };

          const resp = await supertest
            .post(`${CONTENT_ENDPOINT}/create`)
            .set('kbn-xsrf', 'kibana')
            .send(payload)
            .expect(400);

          expect(resp.body.message).to.be(expectedMessages[i]);
        }
      });

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
      it(`should update a group`, async () => {
        const payload: EventAnnotationGroupUpdateIn = {
          contentTypeId: CONTENT_ID,
          data: {
            ...DEFAULT_EVENT_ANNOTATION_GROUP,
            description: 'updated description',
          },
          id: EXISTING_ID_1,
          options: {
            references: DEFAULT_REFERENCES,
          },
          version: API_VERSION,
        };

        const resp = await supertest
          .post(`${CONTENT_ENDPOINT}/update`)
          .set('kbn-xsrf', 'kibana')
          .send(payload)
          .expect(200);

        const result = resp.body.result.result as EventAnnotationGroupCreateOut;

        expect(result.item.attributes).to.eql({
          ...DEFAULT_EVENT_ANNOTATION_GROUP,
          description: 'updated description',
        });
        expect(result.item.id).to.be(EXISTING_ID_1);
      });

      it(`should reject malformed groups`, async () => {
        const badGroups = [
          // extra property
          {
            ...DEFAULT_EVENT_ANNOTATION_GROUP,
            extraProp: 'some-value',
          },
          // missing title
          {
            ...DEFAULT_EVENT_ANNOTATION_GROUP,
            title: undefined,
          },
          // wrong type for property
          {
            ...DEFAULT_EVENT_ANNOTATION_GROUP,
            ignoreGlobalFilters: 'not-a-boolean',
          },
        ] as unknown as EventAnnotationGroupSavedObjectAttributes[]; // (coerce the types because these are intentionally malformed)

        const expectedMessages = [
          'Invalid data. [extraProp]: definition for this key is missing',
          'Invalid data. [title]: expected value of type [string] but got [undefined]',
          'Invalid data. [ignoreGlobalFilters]: expected value of type [boolean] but got [string]',
        ];

        for (let i = 0; i < badGroups.length; i++) {
          const payload: EventAnnotationGroupUpdateIn = {
            contentTypeId: CONTENT_ID,
            data: badGroups[i],
            id: EXISTING_ID_1,
            options: {
              references: DEFAULT_REFERENCES,
            },
            version: API_VERSION,
          };

          const resp = await supertest
            .post(`${CONTENT_ENDPOINT}/update`)
            .set('kbn-xsrf', 'kibana')
            .send(payload)
            .expect(400);

          expect(resp.body.message).to.be(expectedMessages[i]);
        }
      });

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

    describe('delete', () => {
      const deleteGroupByID = (id: string) => {
        const payload: EventAnnotationGroupDeleteIn = {
          contentTypeId: CONTENT_ID,
          id,
          version: API_VERSION,
        };

        return supertest.post(`${CONTENT_ENDPOINT}/delete`).set('kbn-xsrf', 'kibana').send(payload);
      };

      it(`should delete a group`, async () => {
        const resp = await deleteGroupByID(EXISTING_ID_1).expect(200);

        const result = resp.body.result.result as EventAnnotationGroupDeleteOut;

        expect(result.success).to.be(true);
      });

      it(`should reject deleting a group that does not exist`, async () => {
        const resp = await deleteGroupByID('does-not-exist').expect(404);

        expect(resp.body).to.eql({
          error: 'Not Found',
          message: 'Saved object [event-annotation-group/does-not-exist] not found',
          statusCode: 404,
        });
      });
    });
  });
}
