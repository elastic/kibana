/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { delay } from 'bluebird';

import expect from '@kbn/expect';
import { getUrl, kibanaServerTestUser } from '@kbn/test';

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('Interactive setup APIs - Manual configuration flow without TLS', function () {
    this.tags(['skipCloud', 'ciGroup2']);

    let kibanaVerificationCode: string;
    before(async () => {
      kibanaVerificationCode = (
        await supertest.get('/test_endpoints/verification_code').expect(200)
      ).body.verificationCode;
    });

    it('fails to configure with invalid authentication code', async () => {
      const esServerConfig = getService('config').get('servers.elasticsearch');
      const configurePayload = {
        host: getUrl.baseUrl(esServerConfig),
        code: '000000',
        ...kibanaServerTestUser,
      };

      log.debug(`Configure payload ${JSON.stringify(configurePayload)}`);

      await supertest
        .post('/internal/interactive_setup/configure')
        .set('kbn-xsrf', 'xxx')
        .send(configurePayload)
        .expect(403, { statusCode: 403, error: 'Forbidden', message: 'Forbidden' });
    });

    it('fails to configure with invalid credentials', async function () {
      const esServerConfig = getService('config').get('servers.elasticsearch');
      const configurePayload = {
        host: getUrl.baseUrl(esServerConfig),
        code: kibanaVerificationCode,
        ...kibanaServerTestUser,
        password: 'no-way',
      };

      log.debug(`Configure payload ${JSON.stringify(configurePayload)}`);

      await supertest
        .post('/internal/interactive_setup/configure')
        .set('kbn-xsrf', 'xxx')
        .send(configurePayload)
        .expect(500, {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to configure.',
          attributes: { type: 'configure_failure' },
        });
    });

    it('should be able to configure with valid authentication code', async function () {
      this.timeout(60000);

      const esServerConfig = getService('config').get('servers.elasticsearch');
      const configurePayload = {
        host: getUrl.baseUrl(esServerConfig),
        code: kibanaVerificationCode,
        ...kibanaServerTestUser,
      };

      log.debug(`Configure payload ${JSON.stringify(configurePayload)}`);

      await supertest
        .post('/internal/interactive_setup/configure')
        .set('kbn-xsrf', 'xxx')
        .send(configurePayload)
        .expect(204, {});

      // Configure should no longer accept requests.
      await supertest
        .post('/internal/interactive_setup/configure')
        .set('kbn-xsrf', 'xxx')
        .send(configurePayload)
        .expect(400, {
          error: 'Bad Request',
          message: 'Cannot process request outside of preboot stage.',
          statusCode: 400,
          attributes: { type: 'outside_preboot_stage' },
        });

      // Run 30 consequent requests with 1.5s delay to check if Kibana is up and running.
      let kibanaHasBooted = false;
      for (const counter of [...Array(30).keys()]) {
        await delay(1500);

        try {
          expect((await supertest.get('/api/status').expect(200)).body).to.have.keys([
            'version',
            'status',
          ]);

          log.debug(`Kibana has booted after ${(counter + 1) * 1.5}s.`);
          kibanaHasBooted = true;
          break;
        } catch (err) {
          log.debug(`Kibana is still booting after ${(counter + 1) * 1.5}s due to: ${err.message}`);
        }
      }

      expect(kibanaHasBooted).to.be(true);
    });
  });
}
