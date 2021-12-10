/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { getUrl } from '@kbn/test';

import { hasKibanaBooted } from '../fixtures/test_helpers';
import { getElasticsearchCaCertificate } from '../fixtures/tls_tools';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function (context: FtrProviderContext) {
  const supertest = context.getService('supertest');
  const es = context.getService('es');
  const log = context.getService('log');
  const config = context.getService('config');

  describe('Interactive setup APIs - Enrollment flow', function () {
    this.tags(['skipCloud', 'ciGroup2']);

    let kibanaVerificationCode: string;
    let elasticsearchCaFingerprint: string;
    before(async () => {
      const esServerConfig = config.get('servers.elasticsearch');
      elasticsearchCaFingerprint = (
        await getElasticsearchCaCertificate(esServerConfig.host, esServerConfig.port)
      ).fingerprint256.replace(/:/g, '');

      kibanaVerificationCode = (
        await supertest.get('/test_endpoints/verification_code').expect(200)
      ).body.verificationCode;
    });

    let enrollmentAPIKey: string;
    beforeEach(async () => {
      const apiResponse = await es.security.createApiKey({ body: { name: 'enrollment_api_key' } });
      enrollmentAPIKey = Buffer.from(`${apiResponse.id}:${apiResponse.api_key}`).toString('base64');
    });

    afterEach(async () => {
      await es.security.invalidateApiKey({ body: { name: 'enrollment_api_key' } });
    });

    it('fails to enroll with invalid authentication code', async () => {
      const esHost = getUrl.baseUrl(config.get('servers.elasticsearch'));
      const enrollPayload = {
        apiKey: enrollmentAPIKey,
        code: '000000',
        caFingerprint: elasticsearchCaFingerprint,
        hosts: [esHost],
      };

      log.debug(`Enroll payload ${JSON.stringify(enrollPayload)}`);

      await supertest
        .post('/internal/interactive_setup/enroll')
        .set('kbn-xsrf', 'xxx')
        .send(enrollPayload)
        .expect(403, { statusCode: 403, error: 'Forbidden', message: 'Forbidden' });
    });

    it('fails to enroll with invalid CA fingerprint', async () => {
      const esHost = getUrl.baseUrl(config.get('servers.elasticsearch'));
      const enrollPayload = {
        apiKey: enrollmentAPIKey,
        code: kibanaVerificationCode,
        caFingerprint: '3FDAEE71A3604070E6AE6B01412D19772DE5AE129F69C413F0453B293D9BE65D',
        hosts: [esHost],
      };

      log.debug(`Enroll payload ${JSON.stringify(enrollPayload)}`);

      await supertest
        .post('/internal/interactive_setup/enroll')
        .set('kbn-xsrf', 'xxx')
        .send(enrollPayload)
        .expect(500, {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to enroll.',
          attributes: { type: 'enroll_failure' },
        });
    });

    it('fails to enroll with invalid api key', async function () {
      const esServerConfig = config.get('servers.elasticsearch');
      const enrollPayload = {
        apiKey: enrollmentAPIKey,
        code: kibanaVerificationCode,
        caFingerprint: elasticsearchCaFingerprint,
        hosts: [getUrl.baseUrl(esServerConfig)],
      };

      log.debug(`Enroll payload ${JSON.stringify(enrollPayload)}`);

      // Invalidate API key.
      await es.security.invalidateApiKey({ body: { name: 'enrollment_api_key' } });

      await supertest
        .post('/internal/interactive_setup/enroll')
        .set('kbn-xsrf', 'xxx')
        .send(enrollPayload)
        .expect(500, {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to enroll.',
          attributes: { type: 'enroll_failure' },
        });
    });

    it('should be able to enroll with valid authentication code', async function () {
      this.timeout(60000);

      const esServerConfig = config.get('servers.elasticsearch');
      const enrollPayload = {
        apiKey: enrollmentAPIKey,
        code: kibanaVerificationCode,
        caFingerprint: elasticsearchCaFingerprint,
        hosts: [getUrl.baseUrl(esServerConfig)],
      };

      log.debug(`Enroll payload ${JSON.stringify(enrollPayload)}`);

      await supertest
        .post('/internal/interactive_setup/enroll')
        .set('kbn-xsrf', 'xxx')
        .send(enrollPayload)
        .expect(204, {});

      // Enroll should no longer accept requests.
      await supertest
        .post('/internal/interactive_setup/enroll')
        .set('kbn-xsrf', 'xxx')
        .send(enrollPayload)
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
