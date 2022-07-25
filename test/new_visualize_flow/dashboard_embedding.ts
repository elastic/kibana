/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../functional/ftr_provider_context';

/**
 * This tests both that one of each visualization can be added to a dashboard (as opposed to opening an existing
 * dashboard with the visualizations already on it), as well as conducts a rough type of snapshot testing by checking
 * for various ui components. The downside is these tests are a bit fragile to css changes (though not as fragile as
 * actual screenshot snapshot regression testing), and can be difficult to diagnose failures (which visualization
 * broke?).  The upside is that this offers very good coverage with a minimal time investment.
 */

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dashboardExpect = getService('dashboardExpect');
  const dashboardVisualizations = getService('dashboardVisualizations');
  const PageObjects = getPageObjects([
    'common',
    'dashboard',
    'header',
    'visualize',
    'discover',
    'timePicker',
  ]);

  describe('Dashboard Embedding', function describeIndexTests() {
    before(async () => {
      await esArchiver.load('test/new_visualize_flow/fixtures/es_archiver/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.clickNewDashboard();
    });

    it('adding a metric visualization', async function () {
      const originalPanelCount = await PageObjects.dashboard.getPanelCount();
      expect(originalPanelCount).to.eql(0);
      await dashboardVisualizations.createAndEmbedMetric('Embedding Vis Test');
      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['0']);
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);
    });

    it('adding a markdown', async function () {
      const originalPanelCount = await PageObjects.dashboard.getPanelCount();
      expect(originalPanelCount).to.eql(1);
      await dashboardVisualizations.createAndEmbedMarkdown({
        name: 'Embedding Markdown Test',
        markdown: 'Nice to meet you, markdown is my name',
      });
      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.markdownWithValuesExists(['Nice to meet you, markdown is my name']);
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(2);
    });
  });
}
