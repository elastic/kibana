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

  describe('Interactive Setup Functional Tests (Enrolment token)', function () {
    this.tags(['skipCloud', 'ciGroup2']);

    const elasticsearchConfig = config.get('servers.elasticsearch');
    let verificationCode: string;
    let caFingerprint: string;
    before(async () => {
      verificationCode = (await supertest.get('/test_endpoints/verification_code').expect(200)).body
        .verificationCode;

      caFingerprint = (
        await getElasticsearchCaCertificate(elasticsearchConfig.hostname, elasticsearchConfig.port)
      ).fingerprint256
        .replace(/:/g, '')
        .toLowerCase();
    });

    let enrollmentAPIKey: string;
    beforeEach(async () => {
      const apiResponse = await es.security.createApiKey({ body: { name: 'enrollment_api_key' } });
      enrollmentAPIKey = `${apiResponse.body.id}:${apiResponse.body.api_key}`;
    });

    afterEach(async () => {
      await es.security.invalidateApiKey({ body: { name: 'enrollment_api_key' } });
    });

    it('should configure Kibana successfully', async () => {
      this.timeout(60_000);

      await browser.get(`${deployment.getHostPort()}?code=${verificationCode}`);

      const tokenField = await find.byName('token');
      await tokenField.clearValueWithKeyboard();
      await tokenField.type(
        btoa(
          JSON.stringify({
            ver: kibanaPackageJson.version,
            adr: [`${elasticsearchConfig.hostname}:${elasticsearchConfig.port}`],
            fgr: caFingerprint,
            key: enrollmentAPIKey,
          })
        )
      );

      await find.clickByButtonText('Configure Elastic');

      // Wait for login page to load
      await find.byButtonText('Log in', undefined, 60_000);
    });
  });
}

function btoa(str: string) {
  return Buffer.from(str, 'binary').toString('base64');
}
