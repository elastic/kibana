/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { getUrl, kibanaServerTestUser } from '@kbn/test';

import { hasKibanaBooted } from '../fixtures/test_helpers';
import { getElasticsearchCaCertificate } from '../fixtures/tls_tools';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function (context: FtrProviderContext) {
  const supertest = context.getService('supertest');
  const log = context.getService('log');
  const config = context.getService('config');

  describe('Interactive setup APIs - Manual configuration flow', function () {
    this.tags(['skipCloud', 'ciGroup2']);

    let kibanaVerificationCode: string;
    let elasticsearchCaCertificate: string;
    before(async () => {
      const esServerConfig = config.get('servers.elasticsearch');
      elasticsearchCaCertificate = (
        await getElasticsearchCaCertificate(esServerConfig.host, esServerConfig.port)
      ).raw.toString('base64');

      kibanaVerificationCode = (
        await supertest.get('/test_endpoints/verification_code').expect(200)
      ).body.verificationCode;
    });

    it('fails to configure with invalid authentication code', async () => {
      const esServerConfig = config.get('servers.elasticsearch');
      const configurePayload = {
        host: getUrl.baseUrl(esServerConfig),
        code: '000000',
        caCert: elasticsearchCaCertificate,
        ...kibanaServerTestUser,
      };

      log.debug(`Configure payload ${JSON.stringify(configurePayload)}`);

      await supertest
        .post('/internal/interactive_setup/configure')
        .set('kbn-xsrf', 'xxx')
        .send(configurePayload)
        .expect(403, { statusCode: 403, error: 'Forbidden', message: 'Forbidden' });
    });

    it('fails to configure with invalid CA certificate', async () => {
      const esServerConfig = config.get('servers.elasticsearch');
      const configurePayload = {
        host: getUrl.baseUrl(esServerConfig),
        code: kibanaVerificationCode,
        caCert: elasticsearchCaCertificate.split('').reverse().join(''),
        ...kibanaServerTestUser,
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

    it('fails to configure with invalid credentials', async function () {
      const esServerConfig = config.get('servers.elasticsearch');
      const configurePayload = {
        host: getUrl.baseUrl(esServerConfig),
        code: kibanaVerificationCode,
        caCert: elasticsearchCaCertificate,
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

      const esServerConfig = config.get('servers.elasticsearch');
      const configurePayload = {
        host: getUrl.baseUrl(esServerConfig),
        code: kibanaVerificationCode,
        caCert: elasticsearchCaCertificate,
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

      expect(await hasKibanaBooted(context)).to.be(true);
    });
  });
}
