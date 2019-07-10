/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTabs, EuiTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';
import { TopNav } from './top_nav';

interface Tab {
  id: string;
  name: any;
  disabled: boolean;
}

interface Props {
  dateFormat: string;
  disableLinks: boolean;
  showTabs: boolean;
  tabId: string;
  timeHistory: any;
  timefilter: any;
}

function moveToSelectedTab(selectedTabId: string) {
  window.location.href = `${chrome.getBasePath()}/app/ml#/${selectedTabId}`;
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

export const NavigationMenu: SFC<Props> = ({
  dateFormat,
  disableLinks,
  showTabs,
  tabId,
  timeHistory,
  timefilter,
}) => {
  const [tabs] = useState(getTabs(disableLinks));
  const [selectedTabId, setSelectedTabId] = useState(tabId);

  function onSelectedTabChanged(id: string) {
    moveToSelectedTab(id);
    setSelectedTabId(id);
  }

  function renderTabs() {
    return tabs.map((tab: Tab) => (
      <EuiTab
        className="mlNavigationMenu__tab"
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
        disabled={tab.disabled}
        key={`${tab.id}-key`}
      >
        {tab.name}
      </EuiTab>
    ));
  }

  return (
    <Fragment>
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs" className="mlNavigationMenu__topNav">
        <EuiFlexItem grow={false}>
          <TopNav dateFormat={dateFormat} timeHistory={timeHistory} timefilter={timefilter} />
        </EuiFlexItem>
      </EuiFlexGroup>
      {showTabs && <EuiTabs>{renderTabs()}</EuiTabs>}
    </Fragment>
  );
};
