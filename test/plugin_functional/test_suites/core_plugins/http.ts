/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import SemVer from 'semver';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const browser = getService('browser');

  const getCancelationErrorName = async () => {
    return await browser.executeAsync(async (cb) => {
      const errorName = await window._coreProvider.setup.plugins.coreHttp.tryRequestCancellation();
      cb(errorName);
    });
  };

  describe('http requests', () => {
    beforeEach(async () => {
      await PageObjects.common.navigateToApp('home');
    });

    it('returns correct name for aborted requests', async () => {
      const canceledErrorName = await getCancelationErrorName();
      expect(canceledErrorName).to.eql('AbortError');
    });

    it('sets the expected headers', async () => {
      const headers = await browser.executeAsync<Record<string, string>>(async (cb) => {
        cb(await window._coreProvider.setup.core.http.get('/api/core_http/headers'));
      });
      expect(headers).to.have.property('kbn-version');
      expect(!!SemVer.valid(headers['kbn-version'])).to.be(true);

      expect(headers).to.have.property('kbn-build-number');
      expect(headers['kbn-build-number']).to.match(/^\d+$/);

      expect(headers).to.have.property('x-elastic-internal-origin');
      expect(headers['x-elastic-internal-origin']).to.be.a('string');

      expect(headers).to.have.property('x-kbn-context');
      expect(headers['x-kbn-context']).to.be.a('string');
    });
  });
}
