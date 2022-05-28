/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { configArray } from '../constants';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('has user index pattern API', () => {
    configArray.forEach((config) => {
      describe(config.name, () => {
        beforeEach(async () => {
          await esArchiver.emptyKibanaIndex();
          if (await es.indices.exists({ index: 'metrics-test' })) {
            await es.indices.delete({ index: 'metrics-test' });
          }

          if (await es.indices.exists({ index: 'logs-test' })) {
            await es.indices.delete({ index: 'logs-test' });
          }
        });

        const servicePath = `${config.basePath}/has_user_${config.serviceKey}`;

        it('should return false if no index patterns', async () => {
          const response = await supertest.get(servicePath);
          expect(response.status).to.be(200);
          expect(response.body.result).to.be(false);
        });

        it('should return true if has index pattern with user data', async () => {
          await esArchiver.load(
            'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
          );
          await supertest.post(config.path).send({
            override: true,
            [config.serviceKey]: {
              title: 'basic_index',
            },
          });

          const response = await supertest.get(servicePath);
          expect(response.status).to.be(200);
          expect(response.body.result).to.be(true);

          await esArchiver.unload(
            'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
          );
        });

        it('should return true if has user index pattern without data', async () => {
          await supertest.post(config.path).send({
            override: true,
            [config.serviceKey]: {
              title: 'basic_index',
              allowNoIndex: true,
            },
          });

          const response = await supertest.get(servicePath);
          expect(response.status).to.be(200);
          expect(response.body.result).to.be(true);
        });

        it('should return false if only metric-* index pattern without data', async () => {
          await supertest.post(config.path).send({
            override: true,
            [config.serviceKey]: {
              title: 'metrics-*',
              allowNoIndex: true,
            },
          });

          const response = await supertest.get(servicePath);
          expect(response.status).to.be(200);
          expect(response.body.result).to.be(false);
        });

        it('should return true if metric-* index pattern with user data', async () => {
          await es.index({
            index: 'metrics-test',
            body: {
              foo: 'bar',
            },
          });

          await supertest.post(config.path).send({
            override: true,
            [config.serviceKey]: {
              title: 'metrics-*',
            },
          });

          const response = await supertest.get(servicePath);
          expect(response.status).to.be(200);
          expect(response.body.result).to.be(true);
        });

        it('should return false if only logs-* index pattern without data', async () => {
          await supertest.post(config.path).send({
            override: true,
            [config.serviceKey]: {
              title: 'logs-*',
            },
          });

          const response = await supertest.get(servicePath);
          expect(response.status).to.be(200);
          expect(response.body.result).to.be(false);
        });

        it('should return true if logs-* index pattern with user data', async () => {
          await es.index({
            index: 'logs-test',
            body: {
              foo: 'bar',
            },
          });

          await supertest.post(config.path).send({
            override: true,
            [config.serviceKey]: {
              title: 'logs-*',
            },
          });

          const response = await supertest.get(servicePath);
          expect(response.status).to.be(200);
          expect(response.body.result).to.be(true);
        });

        // TODO: should setup fleet first similar to x-pack/test/fleet_functional/apps/home/welcome.ts
        // but it is skipped due to flakiness https://github.com/elastic/kibana/issues/109017
        it('should return false if logs-* with .ds-logs-elastic_agent only');
        it('should return false if metrics-* with .ds-metrics-elastic_agent only');
      });
    });
  });
}
