/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiTab, EuiTabs, EuiLink } from '@elastic/eui';
import { get, getOr } from 'lodash/fp';

import * as React from 'react';
import styled from 'styled-components';
import classnames from 'classnames';

import { trackUiAction as track, METRIC_TYPE, TELEMETRY_EVENT } from '../../../lib/track_usage';
import { HostsTableType } from '../../../store/hosts/model';
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

interface TabNavigationState {
  selectedTabId: string;
}

export class TabNavigation extends React.PureComponent<TabNavigationProps, TabNavigationState> {
  constructor(props: TabNavigationProps) {
    super(props);
    const selectedTabId = this.mapLocationToTab(props.pageName, props.tabName);
    this.state = { selectedTabId };
  }
  public componentWillReceiveProps(nextProps: TabNavigationProps): void {
    const selectedTabId = this.mapLocationToTab(nextProps.pageName, nextProps.tabName);

    if (this.state.selectedTabId !== selectedTabId) {
      this.setState(prevState => ({
        ...prevState,
        selectedTabId,
      }));
    }
  }
  public render() {
    const { display = 'condensed' } = this.props;
    return (
      <EuiTabs display={display} size="m">
        {this.renderTabs()}
      </EuiTabs>
    );
  }

  public mapLocationToTab = (pageName: string, tabName?: HostsTableType): string => {
    const { navTabs } = this.props;
    return getOr(
      '',
      'id',
      Object.values(navTabs).find(item => tabName === item.id || pageName === item.id)
    );
  };

  private renderTabs = (): JSX.Element[] => {
    const { navTabs } = this.props;
    return Object.keys(navTabs).map(tabName => {
      const tab = get(tabName, navTabs);
      return (
        <TabContainer
          className={classnames({ euiTab: true, showBorder: this.props.showBorder })}
          key={`navigation-${tab.id}`}
        >
          <EuiLink
            data-test-subj={`navigation-link-${tab.id}`}
            href={tab.href + getSearch(tab, this.props)}
          >
            <EuiTab
              data-href={tab.href}
              data-test-subj={`navigation-${tab.id}`}
              disabled={tab.disabled}
              isSelected={this.state.selectedTabId === tab.id}
              onClick={() => {
                track(METRIC_TYPE.CLICK, `${TELEMETRY_EVENT.TAB_CLICKED}${tab.id}`);
              }}
            >
              {tab.name}
            </EuiTab>
          </EuiLink>
        </TabContainer>
      );
    });
  };
}
