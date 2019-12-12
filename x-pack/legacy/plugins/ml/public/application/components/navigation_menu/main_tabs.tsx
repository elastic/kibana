/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { EuiTabs, EuiTab, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TabId } from './navigation_menu';

export interface Tab {
  id: TabId;
  name: any;
  disabled: boolean;
}

interface Props {
  disableLinks: boolean;
  tabId: TabId;
}

function getTabs(disableLinks: boolean): Tab[] {
  return [
    {
      id: 'overview',
      name: i18n.translate('xpack.ml.navMenu.overviewTabLinkText', {
        defaultMessage: 'Overview',
      }),
      disabled: disableLinks,
    },
    {
      id: 'anomaly_detection',
      name: i18n.translate('xpack.ml.navMenu.anomalyDetectionTabLinkText', {
        defaultMessage: 'Anomaly Detection',
      }),
      disabled: disableLinks,
    },
    {
      id: 'data_frame_analytics',
      name: i18n.translate('xpack.ml.navMenu.dataFrameAnalyticsTabLinkText', {
        defaultMessage: 'Data Frame Analytics',
      }),
      disabled: disableLinks,
    },
    {
      id: 'datavisualizer',
      name: i18n.translate('xpack.ml.navMenu.dataVisualizerTabLinkText', {
        defaultMessage: 'Data Visualizer',
      }),
      disabled: false,
    },
  ];
}
interface TabData {
  testSubject: string;
  pathId?: string;
}

const TAB_DATA: Record<TabId, TabData> = {
  overview: { testSubject: 'mlMainTab overview', pathId: 'overview' },
  anomaly_detection: { testSubject: 'mlMainTab anomalyDetection', pathId: 'jobs' },
  data_frame_analytics: { testSubject: 'mlMainTab dataFrameAnalytics' },
  datavisualizer: { testSubject: 'mlMainTab dataVisualizer' },
};

export const MainTabs: FC<Props> = ({ tabId, disableLinks }) => {
  const [selectedTabId, setSelectedTabId] = useState(tabId);
  function onSelectedTabChanged(id: string) {
    setSelectedTabId(id);
  }

  const tabs = getTabs(disableLinks);

  return (
    <EuiTabs display="condensed">
      {tabs.map((tab: Tab) => {
        const id = tab.id;
        const testSubject = TAB_DATA[id].testSubject;
        const defaultPathId = TAB_DATA[id].pathId || id;
        return (
          <EuiLink
            data-test-subj={testSubject + (id === selectedTabId ? ' selected' : '')}
            href={`#/${defaultPathId}`}
            key={`${id}-key`}
            color="text"
          >
            <EuiTab
              className={'mlNavigationMenu__mainTab'}
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
