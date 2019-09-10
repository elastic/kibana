/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { EuiTabs, EuiTab, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';
import { Tab } from './main_tabs';
import { TabId } from './navigation_menu';

interface Props {
  disableLinks: boolean;
  mainTabId: TabId;
  tabId: TabId;
}

function getTabs(tabId: TabId, disableLinks: boolean): Tab[] {
  const TAB_MAP = {
    overview: [],
    datavisualizer: [],
    anomaly_detection: [
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
        id: 'settings',
        name: i18n.translate('xpack.ml.navMenu.settingsTabLinkText', {
          defaultMessage: 'Settings',
        }),
        disabled: disableLinks,
      },
    ],
    main_data_frame_analytics: [
      {
        id: 'data_frames',
        name: i18n.translate('xpack.ml.navMenu.dataFrameTabLinkText', {
          defaultMessage: 'Transforms',
        }),
        disabled: false,
      },
      {
        id: 'data_frame_analytics',
        name: i18n.translate('xpack.ml.navMenu.dataFrameAnalyticsTabLinkText', {
          defaultMessage: 'Analytics',
        }),
        disabled: disableLinks,
      },
    ],
  };

  type TAB_MAP_ID = keyof typeof TAB_MAP;

  return TAB_MAP[tabId as TAB_MAP_ID];
}

enum TAB_TEST_SUBJECT {
  jobs = 'mlTabJobManagement',
  explorer = 'mlTabAnomalyExplorer',
  timeseriesexplorer = 'mlTabSingleMetricViewer',
  data_frames = 'mlTabDataFrames', // eslint-disable-line
  data_frame_analytics = 'mlTabDataFrameAnalytics', // eslint-disable-line
  datavisualizer = 'mlTabDataVisualizer',
  settings = 'mlTabSettings',
}

type TAB_TEST_SUBJECTS = keyof typeof TAB_TEST_SUBJECT;

export const Tabs: FC<Props> = ({ tabId, mainTabId, disableLinks }) => {
  const [selectedTabId, setSelectedTabId] = useState(tabId);
  function onSelectedTabChanged(id: string) {
    setSelectedTabId(id);
  }

  const tabs = getTabs(mainTabId, disableLinks);

  return (
    <EuiTabs size="s">
      {tabs.map((tab: Tab) => {
        const id = tab.id;
        return (
          <EuiLink
            data-test-subj={TAB_TEST_SUBJECT[id as TAB_TEST_SUBJECTS]}
            href={`${chrome.getBasePath()}/app/ml#/${id}`}
            key={`${id}-key`}
            color="text"
          >
            <EuiTab
              className="mlNavigationMenu__tab"
              onClick={() => onSelectedTabChanged(id)}
              isSelected={id === selectedTabId}
              disabled={tab.disabled}
            >
              {tab.name}
            </EuiTab>
          </EuiLink>
        );
      })}
    </EuiTabs>
  );
};
