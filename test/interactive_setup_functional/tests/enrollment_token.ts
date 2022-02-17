/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { kibanaPackageJson } from '@kbn/utils';

import type { FtrProviderContext } from '../../functional/ftr_provider_context';
import { getElasticsearchCaCertificate } from '../../interactive_setup_api_integration/fixtures/tls_tools';

export default function ({ getService }: FtrProviderContext) {
  const browser = getService('browser');
  const find = getService('find');
  const supertest = getService('supertest');
  const deployment = getService('deployment');
  const es = getService('es');
  const config = getService('config');
  const retry = getService('retry');
  const log = getService('log');

  describe('Interactive Setup Functional Tests (Enrollment token)', function () {
    this.tags(['skipCloud', 'ciGroup2']);

    const elasticsearchConfig = config.get('servers.elasticsearch');
    let verificationCode: string;
    let caFingerprint: string;
    before(async function () {
      verificationCode = (await supertest.get('/test_endpoints/verification_code').expect(200)).body
        .verificationCode;
      log.info(`Verification code: ${verificationCode}`);

      caFingerprint = (
        await getElasticsearchCaCertificate(elasticsearchConfig.hostname, elasticsearchConfig.port)
      ).fingerprint256
        .replace(/:/g, '')
        .toLowerCase();
      log.info(`Elasticsearch ca fingerprint: ${caFingerprint}`);
    });

    let enrollmentAPIKey: string;
    beforeEach(async function () {
      const apiResponse = await es.security.createApiKey({ body: { name: 'enrollment_api_key' } });
      enrollmentAPIKey = `${apiResponse.id}:${apiResponse.api_key}`;
      log.info(`API key for enrollment token: ${enrollmentAPIKey}`);
    });

    afterEach(async function () {
      await es.security.invalidateApiKey({ body: { name: 'enrollment_api_key' } });
    });

    it('should configure Kibana successfully', async function () {
      this.timeout(150_000);

      const enrollmentToken = btoa(
        JSON.stringify({
          ver: kibanaPackageJson.version,
          adr: [`${elasticsearchConfig.hostname}:${elasticsearchConfig.port}`],
          fgr: caFingerprint,
          key: enrollmentAPIKey,
        })
      );

      await browser.get(`${deployment.getHostPort()}?code=${verificationCode}`);
      const initialUrl = await browser.getCurrentUrl();
      log.info(`Opened interactive setup: ${initialUrl}`);

      const tokenField = await find.byName('token');
      await tokenField.clearValueWithKeyboard();
      await tokenField.type(enrollmentToken);
      log.info(`Entered enrollment token: ${enrollmentToken}`);

      await find.clickByButtonText('Configure Elastic');
      log.info('Submitted form');

      await retry.waitForWithTimeout('redirect to login page', 120_000, async () => {
        log.debug(`Current URL: ${await browser.getCurrentUrl()}, initial URL: ${initialUrl}`);
        return (await browser.getCurrentUrl()) !== initialUrl;
      });
    });
  });
}

function btoa(str: string) {
  return Buffer.from(str, 'binary').toString('base64');
}
