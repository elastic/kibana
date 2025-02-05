/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { DeprecationsGetResponse } from '@kbn/core/server';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import type { DeprecationDetailsMessage } from '@kbn/core-deprecations-common';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('scripted field deprecations', () => {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await esArchiver.load('test/api_integration/fixtures/es_archiver/index_patterns/basic_index');
    });

    after(async () => {
      await esArchiver.unload(
        'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
      );
    });

    it('no scripted fields deprecations', async () => {
      const { body } = await supertest
        .get('/api/deprecations/')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana');

      const { deprecations } = body as DeprecationsGetResponse;
      const dataPluginDeprecations = deprecations.filter(
        ({ domainId }) => domainId === 'dataViews'
      );

      expect(dataPluginDeprecations.length).to.be(0);
    });

    it('scripted field deprecation', async () => {
      const title = `basic_index`;
      await supertest
        .post('/api/index_patterns/index_pattern')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          index_pattern: {
            title,
            fields: {
              foo: {
                name: 'foo',
                type: 'string',
                scripted: true,
                script: "doc['field_name'].value",
              },
              bar: {
                name: 'bar',
                type: 'number',
                scripted: true,
                script: "doc['field_name'].value",
              },
            },
          },
        });

      const { body } = await supertest
        .get('/api/deprecations/')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana');
      const { deprecations } = body as DeprecationsGetResponse;
      const dataPluginDeprecations = deprecations.filter(
        ({ domainId }) => domainId === 'dataViews'
      );

      expect(dataPluginDeprecations.length).to.be(1);
      expect((dataPluginDeprecations[0].message as DeprecationDetailsMessage).content).to.contain(
        title
      );
    });
  });
}
