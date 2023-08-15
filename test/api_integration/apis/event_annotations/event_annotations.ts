/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const CONTENT_ENDPOINT = '/api/content_management/rpc';

const CONTENT_TYPE_ID = 'event-annotation-group';

const API_VERSION = 1;

const EXISTING_ID_1 = 'fcebef20-3ba4-11ee-85d3-3dd00bdd66ef'; // from loaded archive
const EXISTING_ID_2 = '0d1aa670-3baf-11ee-a4a7-c11cb33a9549'; // from loaded archive

const DEFAULT_EVENT_ANNOTATION_GROUP = {
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

    describe('search', () => {
      // TODO test tag searching, ordering, pagination, etc

      it(`should retrieve existing groups`, async () => {
        const resp = await supertest
          .post(`${CONTENT_ENDPOINT}/search`)
          .set('kbn-xsrf', 'kibana')
          .send({
            contentTypeId: CONTENT_TYPE_ID,
            query: {
              limit: 1000,
              tags: {
                included: [],
                excluded: [],
              },
            },
            version: API_VERSION,
          })
          .expect(200);

        const results = resp.body.result.result.hits;
        expect(results.length).to.be(2);
        expect(results.map(({ id }: { id: string }) => id)).to.eql([EXISTING_ID_2, EXISTING_ID_1]);
      });
    });

    describe('create', () => {
      it(`should require dataViewSpec to be specified`, async () => {
        const createWithDataViewSpec = (dataViewSpec: any) =>
          supertest
            .post(`${CONTENT_ENDPOINT}/create`)
            .set('kbn-xsrf', 'kibana')
            .send({
              contentTypeId: CONTENT_TYPE_ID,
              data: { ...DEFAULT_EVENT_ANNOTATION_GROUP, dataViewSpec },
              options: {
                references: DEFAULT_REFERENCES,
              },
              version: API_VERSION,
            });

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
      it(`should require dataViewSpec to be specified`, async () => {
        const updateWithDataViewSpec = (dataViewSpec: any) =>
          supertest
            .post(`${CONTENT_ENDPOINT}/update`)
            .set('kbn-xsrf', 'kibana')
            .send({
              contentTypeId: CONTENT_TYPE_ID,
              data: { ...DEFAULT_EVENT_ANNOTATION_GROUP, dataViewSpec },
              id: EXISTING_ID_1,
              options: {
                references: DEFAULT_REFERENCES,
              },
              version: API_VERSION,
            });

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

    // TODO - delete
  });
}
