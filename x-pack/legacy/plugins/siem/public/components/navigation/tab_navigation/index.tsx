/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiTab, EuiTabs, EuiLink } from '@elastic/eui';
import { getOr } from 'lodash/fp';

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import classnames from 'classnames';

import { trackUiAction as track, METRIC_TYPE, TELEMETRY_EVENT } from '../../../lib/track_usage';
import { getSearch } from '../helpers';
import { TabNavigationProps } from './types';

const TabContainer = styled.div`
  .euiLink {
    color: inherit !important;

    &:focus {
      outline: 0;
      background: none;
    }

    .euiTab.euiTab-isSelected {
      cursor: pointer;
    }
  }

  &.showBorder {
    padding: 8px 8px 0;
  }
`;

TabContainer.displayName = 'TabContainer';

export const TabNavigation = React.memo<TabNavigationProps>(props => {
  const { display = 'condensed', navTabs, pageName, showBorder, tabName } = props;
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
  }, [pageName, tabName]);

  const renderTabs = (): JSX.Element[] =>
    Object.values(navTabs).map(tab => (
      <TabContainer
        className={classnames({ euiTab: true, showBorder })}
        key={`navigation-${tab.id}`}
      >
        <EuiLink
          data-test-subj={`navigation-link-${tab.id}`}
          href={tab.href + getSearch(tab, props)}
        >
          <EuiTab
            data-href={tab.href}
            data-test-subj={`navigation-${tab.id}`}
            disabled={tab.disabled}
            isSelected={selectedTabId === tab.id}
            onClick={() => {
              track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.TAB_CLICKED}${tab.id}`);
            }}
          >
            {tab.name}
          </EuiTab>
        </EuiLink>
      </TabContainer>
    ));
  return (
    <EuiTabs display={display} size="m">
      {renderTabs()}
    </EuiTabs>
  );
});
