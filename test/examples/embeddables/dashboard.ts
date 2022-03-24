/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginFunctionalProviderContext } from 'test/plugin_functional/services';

export const testDashboardInput = {
  panels: {
    '1': {
      gridData: {
        w: 24,
        h: 15,
        x: 0,
        y: 15,
        i: '1',
      },
      type: 'HELLO_WORLD_EMBEDDABLE',
      explicitInput: {
        id: '1',
      },
    },
    '822cd0f0-ce7c-419d-aeaa-1171cf452745': {
      gridData: {
        w: 24,
        h: 15,
        x: 0,
        y: 0,
        i: '822cd0f0-ce7c-419d-aeaa-1171cf452745',
      },
      type: 'visualization',
      explicitInput: {
        id: '822cd0f0-ce7c-419d-aeaa-1171cf452745',
        savedObjectId: '3fe22200-3dcb-11e8-8660-4d65aa086b3c',
      },
    },
    '66f0a265-7b06-4974-accd-d05f74f7aa82': {
      gridData: {
        w: 24,
        h: 15,
        x: 24,
        y: 0,
        i: '66f0a265-7b06-4974-accd-d05f74f7aa82',
      },
      type: 'visualization',
      explicitInput: {
        id: '66f0a265-7b06-4974-accd-d05f74f7aa82',
        savedObjectId: '4c0f47e0-3dcd-11e8-8660-4d65aa086b3c',
      },
    },
    'b2861741-40b9-4dc8-b82b-080c6e29a551': {
      gridData: {
        w: 24,
        h: 15,
        x: 0,
        y: 15,
        i: 'b2861741-40b9-4dc8-b82b-080c6e29a551',
      },
      type: 'search',
      explicitInput: {
        id: 'b2861741-40b9-4dc8-b82b-080c6e29a551',
        savedObjectId: 'be5accf0-3dca-11e8-8660-4d65aa086b3c',
      },
    },
  },
  isEmbeddedExternally: false,
  isFullScreenMode: false,
  filters: [],
  useMargins: true,
  id: '',
  hidePanelTitles: false,
  query: {
    query: '',
    language: 'kuery',
  },
  timeRange: {
    from: '2017-10-01T20:20:36.275Z',
    to: '2019-02-04T21:20:55.548Z',
  },
  refreshConfig: {
    value: 0,
    pause: true,
  },
  viewMode: 'edit',
  lastReloadRequestTime: 1556569306103,
  title: 'New Dashboard',
  description: '',
};

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const pieChart = getService('pieChart');
  const dashboardExpect = getService('dashboardExpect');
  const elasticChart = getService('elasticChart');
  const PageObjects = getPageObjects(['common', 'visChart', 'dashboard']);
  const monacoEditor = getService('monacoEditor');

  describe('dashboard container', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/dashboard/current/data');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await PageObjects.common.navigateToApp('dashboardEmbeddableExamples');
      await testSubjects.click('dashboardEmbeddableByValue');
      await PageObjects.dashboard.waitForRenderComplete();

      await updateInput(JSON.stringify(testDashboardInput, null, 4));
    });

    it('pie charts', async () => {
      if (await PageObjects.visChart.isNewChartsLibraryEnabled()) {
        await elasticChart.setNewChartUiDebugFlag();
      }
      await pieChart.expectPieSliceCount(5);
    });

    it('markdown', async () => {
      await dashboardExpect.markdownWithValuesExists(["I'm a markdown!"]);
    });

    it('saved search', async () => {
      await dashboardExpect.savedSearchRowCount(10);
    });
  });

  async function updateInput(input: string) {
    await monacoEditor.setCodeEditorValue(input);
    await testSubjects.click('dashboardEmbeddableByValueInputSubmit');
  }
}
