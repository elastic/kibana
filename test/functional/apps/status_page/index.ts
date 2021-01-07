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

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  describe('status page', function () {
    this.tags('ciGroup1');

    beforeEach(async () => {
      await PageObjects.common.navigateToApp('status_page');
    });

    it('should show the build hash and number', async () => {
      const buildNumberText = await testSubjects.getVisibleText('statusBuildNumber');
      expect(buildNumberText).to.contain('BUILD ');

      const hashText = await testSubjects.getVisibleText('statusBuildHash');
      expect(hashText).to.contain('COMMIT ');
    });

    it('should display the server metrics', async () => {
      const metrics = await testSubjects.findAll('serverMetric');
      expect(metrics).to.have.length(6);
    });

    it('should display the server status', async () => {
      const titleText = await testSubjects.getVisibleText('serverStatusTitle');
      expect(titleText).to.contain('Kibana status is');

      const serverStatus = await testSubjects.getAttribute('serverStatusTitleBadge', 'aria-label');
      expect(serverStatus).to.be('Green');
    });
  });
}
