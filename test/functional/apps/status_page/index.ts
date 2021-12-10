/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

    it('should show the build version', async () => {
      const buildVersionText = await testSubjects.getVisibleText('statusBuildVersion');
      expect(buildVersionText).to.contain('VERSION: ');
    });

    it('should show the build number', async () => {
      const buildNumberText = await testSubjects.getVisibleText('statusBuildNumber');
      expect(buildNumberText).to.contain('BUILD: ');
    });

    it('should show the build hash', async () => {
      const hashText = await testSubjects.getVisibleText('statusBuildHash');
      expect(hashText).to.contain('COMMIT: ');
    });

    it('should display the server metrics', async () => {
      const metrics = await testSubjects.findAll('serverMetric');
      expect(metrics).to.have.length(6);
    });

    it('should display the server metrics meta', async () => {
      const metricsMetas = await testSubjects.findAll('serverMetricMeta');
      expect(metricsMetas).to.have.length(3);
    });

    it('should display the server status', async () => {
      const titleText = await testSubjects.getVisibleText('serverStatusTitle');
      expect(titleText).to.contain('Kibana status is');

      const serverStatus = await testSubjects.getAttribute('serverStatusTitleBadge', 'aria-label');
      expect(serverStatus).to.be('Green');
    });
  });
}
