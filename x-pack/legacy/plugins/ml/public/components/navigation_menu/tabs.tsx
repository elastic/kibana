/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { EuiTabs, EuiTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';

interface Tab {
  id: string;
  name: any;
  disabled: boolean;
}

interface TestSubjMap {
  [key: string]: string;
}

interface Props {
  disableLinks: boolean;
  tabId: string;
}

function getTabs(disableLinks: boolean): Tab[] {
  return [
    {
      id: 'jobs',
      name: i18n.translate('xpack.ml.navMenu.jobManagementTabLinkText', {
        defaultMessage: 'Job Management',
      }),
      disabled: disableLinks,
    },
    {
      id: 'explorer',
      name: i18n.translate('xpack.ml.navMenu.anomalyExplorerTabLinkText', {
        defaultMessage: 'Anomaly Explorer',
      }),
      disabled: disableLinks,
    },
    {
      id: 'timeseriesexplorer',
      name: i18n.translate('xpack.ml.navMenu.singleMetricViewerTabLinkText', {
        defaultMessage: 'Single Metric Viewer',
      }),
      disabled: disableLinks,
    },
    {
      id: 'data_frames',
      name: i18n.translate('xpack.ml.navMenu.dataFrameTabLinkText', {
        defaultMessage: 'Data Frames',
      }),
      disabled: false,
    },
    {
      id: 'datavisualizer',
      name: i18n.translate('xpack.ml.navMenu.dataVisualizerTabLinkText', {
        defaultMessage: 'Data Visualizer',
      }),
      disabled: false,
    },
    {
      id: 'settings',
      name: i18n.translate('xpack.ml.navMenu.settingsTabLinkText', {
        defaultMessage: 'Settings',
      }),
      disabled: disableLinks,
    },
  ];
}

const TAB_TEST_SUBJ_MAP: TestSubjMap = {
  jobs: 'mlTabJobManagement',
  explorer: 'mlTabAnomalyExplorer',
  timeseriesexplorer: 'mlTabSingleMetricViewer',
  data_frames: 'mlTabDataFrames',
  datavisualizer: 'mlTabDataVisualizer',
  settings: 'mlTabSettings',
};

function moveToSelectedTab(selectedTabId: string) {
  window.location.href = `${chrome.getBasePath()}/app/ml#/${selectedTabId}`;
}

export const Tabs: FC<Props> = ({ tabId, disableLinks }) => {
  const [selectedTabId, setSelectedTabId] = useState(tabId);
  function onSelectedTabChanged(id: string) {
    moveToSelectedTab(id);
    setSelectedTabId(id);
  }

  const tabs = getTabs(disableLinks);

  return (
    <EuiTabs>
      {tabs.map((tab: Tab) => (
        <EuiTab
          className="mlNavigationMenu__tab"
          onClick={() => onSelectedTabChanged(tab.id)}
          isSelected={tab.id === selectedTabId}
          disabled={tab.disabled}
          key={`${tab.id}-key`}
          data-test-subj={TAB_TEST_SUBJ_MAP[tab.id]}
        >
          {tab.name}
        </EuiTab>
      ))}
    </EuiTabs>
  );
};
