/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiTab, EuiTabs } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import React, { useEffect, useState, useCallback, useMemo } from 'react';

import { trackUiAction as track, METRIC_TYPE, TELEMETRY_EVENT } from '../../../lib/track_usage';
import { getSearch } from '../helpers';
import { TabNavigationProps, TabNavigationItemProps } from './types';

const TabNavigationItemComponent = ({
  href,
  hrefWithSearch,
  id,
  disabled,
  name,
  isSelected,
}: TabNavigationItemProps) => {
  const handleClick = useCallback(() => {
    track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.TAB_CLICKED}${id}`);
  }, [id]);

  return (
    <EuiTab
      data-href={href}
      data-test-subj={`navigation-${id}`}
      disabled={disabled}
      href={hrefWithSearch}
      isSelected={isSelected}
      onClick={handleClick}
    >
      {name}
    </EuiTab>
  );
};

const TabNavigationItem = React.memo(TabNavigationItemComponent);

export const TabNavigationComponent = (props: TabNavigationProps) => {
  const { display, navTabs, pageName, tabName } = props;

  const mapLocationToTab = useCallback(
    (): string =>
      getOr(
        '',
        'id',
        Object.values(navTabs).find(item => tabName === item.id || pageName === item.id)
      ),
    [pageName, tabName, navTabs]
  );
  const [selectedTabId, setSelectedTabId] = useState(mapLocationToTab());
  useEffect(() => {
    const currentTabSelected = mapLocationToTab();

    if (currentTabSelected !== selectedTabId) {
      setSelectedTabId(currentTabSelected);
    }

    // we do need navTabs in case the selectedTabId appears after initial load (ex. checking permissions for anomalies)
  }, [pageName, tabName, navTabs, mapLocationToTab, selectedTabId]);

  const renderTabs = useMemo(
    () =>
      Object.values(navTabs).map(tab => {
        const isSelected = selectedTabId === tab.id;
        const hrefWithSearch = tab.href + getSearch(tab, props);

        return (
          <TabNavigationItem
            key={`navigation-${tab.id}`}
            id={tab.id}
            href={tab.href}
            name={tab.name}
            disabled={tab.disabled}
            hrefWithSearch={hrefWithSearch}
            isSelected={isSelected}
          />
        );
      }),
    [navTabs, selectedTabId, props]
  );

  return <EuiTabs display={display}>{renderTabs}</EuiTabs>;
};

TabNavigationComponent.displayName = 'TabNavigationComponent';

export const TabNavigation = React.memo(TabNavigationComponent);

TabNavigation.displayName = 'TabNavigation';
