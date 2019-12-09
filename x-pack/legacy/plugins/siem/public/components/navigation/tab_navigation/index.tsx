/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiTab, EuiTabs } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React, { useEffect, useState } from 'react';

import { trackUiAction as track, METRIC_TYPE, TELEMETRY_EVENT } from '../../../lib/track_usage';
import { getSearch } from '../helpers';
import { TabNavigationProps } from './types';

export const TabNavigationComponent = (props: TabNavigationProps) => {
  const { display, navTabs, pageName, tabName } = props;

  const mapLocationToTab = (): string => {
    return getOr(
      '',
      'id',
      Object.values(navTabs).find(item => tabName === item.id || pageName === item.id)
    );
  };

  const [selectedTabId, setSelectedTabId] = useState(mapLocationToTab());
  useEffect(() => {
    const currentTabSelected = mapLocationToTab();

    if (currentTabSelected !== selectedTabId) {
      setSelectedTabId(currentTabSelected);
    }

    // we do need navTabs in case the selectedTabId appears after initial load (ex. checking permissions for anomalies)
  }, [pageName, tabName, navTabs]);

  const renderTabs = (): JSX.Element[] =>
    Object.values(navTabs).map(tab => (
      <EuiTab
        data-href={tab.href}
        data-test-subj={`navigation-${tab.id}`}
        disabled={tab.disabled}
        href={tab.href + getSearch(tab, props)}
        isSelected={selectedTabId === tab.id}
        key={`navigation-${tab.id}`}
        onClick={() => {
          track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.TAB_CLICKED}${tab.id}`);
        }}
      >
        {tab.name}
      </EuiTab>
    ));

  return <EuiTabs display={display}>{renderTabs()}</EuiTabs>;
};

TabNavigationComponent.displayName = 'TabNavigationComponent';

export const TabNavigation = React.memo(TabNavigationComponent);

TabNavigation.displayName = 'TabNavigation';
