/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import url from 'url';
import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

const getKibanaUrl = (pathname?: string, search?: string) =>
  url.format({
    protocol: 'http:',
    hostname: process.env.TEST_KIBANA_HOST || 'localhost',
    port: process.env.TEST_KIBANA_PORT || '5620',
    pathname,
    search,
  });

// eslint-disable-next-line import/no-default-export
export default function({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const browser = getService('browser');
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');

  describe('application using leave confirmation', () => {
    describe('when navigating to another app', () => {
      it('prevents navigation if user click cancel on the confirmation dialog', async () => {
        await PageObjects.common.navigateToApp('appleave1');
        await appsMenu.clickLink('AppLeave 2');

        await testSubjects.existOrFail('appLeaveConfirmModal');
        await PageObjects.common.clickCancelOnModal(false);
        expect(await browser.getCurrentUrl()).to.eql(getKibanaUrl('/app/appleave1'));
      });
      it('allows navigation if user click confirm on the confirmation dialog', async () => {
        await PageObjects.common.navigateToApp('appleave1');
        await appsMenu.clickLink('AppLeave 2');

        await testSubjects.existOrFail('appLeaveConfirmModal');
        await PageObjects.common.clickConfirmOnModal();
        expect(await browser.getCurrentUrl()).to.eql(getKibanaUrl('/app/appleave2'));
      });
    });

    describe('when navigating to a legacy app', () => {
      it('prevents navigation if user click cancel on the alert dialog', async () => {
        await PageObjects.common.navigateToApp('appleave1');
        await appsMenu.clickLink('Core Legacy Compat');

        const alert = await browser.getAlert();
        expect(alert).not.to.eql(undefined);
        alert!.dismiss();
        expect(await browser.getCurrentUrl()).to.eql(getKibanaUrl('/app/appleave1'));
      });
      it('allows navigation if user click leave on the alert dialog', async () => {
        await PageObjects.common.navigateToApp('appleave1');
        await appsMenu.clickLink('Core Legacy Compat');

        const alert = await browser.getAlert();
        expect(alert).not.to.eql(undefined);
        alert!.accept();
        expect(await browser.getCurrentUrl()).to.eql(getKibanaUrl('/app/core_plugin_legacy'));
      });
    });
  });
}
