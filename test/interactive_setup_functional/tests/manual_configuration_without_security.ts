/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getUrl } from '@kbn/test';
import type { FtrProviderContext } from '../../functional/ftr_provider_context';

export default function ({ getService, getPageObject }: FtrProviderContext) {
  const browser = getService('browser');
  const find = getService('find');
  const supertest = getService('supertest');
  const deployment = getService('deployment');
  const config = getService('config');
  const retry = getService('retry');
  const log = getService('log');

  describe('Interactive Setup Functional Tests (Manual configuration without Security)', function () {
    this.tags(['skipCloud', 'ciGroup2']);

    let verificationCode: string;
    before(async function () {
      verificationCode = (await supertest.get('/test_endpoints/verification_code').expect(200)).body
        .verificationCode;
    });

    it('should configure Kibana successfully', async function () {
      this.timeout(150_000);

      await browser.get(`${deployment.getHostPort()}?code=${verificationCode}`);
      const url = await browser.getCurrentUrl();

      await find.clickByButtonText('Configure manually');

      const elasticsearchHost = getUrl.baseUrl(config.get('servers.elasticsearch'));
      const hostField = await find.byName('host');
      await hostField.clearValueWithKeyboard();
      await hostField.type(elasticsearchHost);

      await find.clickByButtonText('Check address');

      await find.clickByButtonText('Configure Elastic');

      await retry.waitForWithTimeout('redirect to home page', 120_000, async () => {
        log.debug(`Current URL: ${await browser.getCurrentUrl()}, initial URL: ${url}`);
        return (await browser.getCurrentUrl()) !== url;
      });
    });
  });
}
