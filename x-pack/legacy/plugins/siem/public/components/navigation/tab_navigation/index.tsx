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
import { NavigationParams } from '../breadcrumbs';
import { HostsTableType } from '../../../store/hosts/model';
import { TabNavigationComponentProps } from '..';

export interface NavTab {
  id: string;
  name: string;
  href: string;
  disabled: boolean;
}

interface NavMatchParams {
  params: NavigationParams;
}

interface TabNavigationRouteProps {
  location: string;
  search: string;
  match?: NavMatchParams;
}

type TabNavigationProps = TabNavigationRouteProps & TabNavigationComponentProps;

const TabContainer = styled.div`
  .euiLink {
    color: inherit !important;
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
    const pathname = props.location;
    const match = props.match;
    const selectedTabId = this.mapLocationToTab(pathname, match);
    this.state = { selectedTabId };
  }
  public componentWillReceiveProps(nextProps: TabNavigationProps): void {
    const pathname = nextProps.location;
    const match = nextProps.match;
    const selectedTabId = this.mapLocationToTab(pathname, match);

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

  public mapLocationToTab = (pathname: string, match?: NavMatchParams): string => {
    const { navTabs } = this.props;
    const tabName: HostsTableType | undefined = get('params.tabName', match);
    const myNavTab = Object.keys(navTabs)
      .map(tab => get(tab, navTabs))
      .filter((item: NavTab) => (tabName || pathname).includes(item.id))[0];
    return getOr('', 'id', myNavTab);
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
          <EuiLink data-test-subj={`navigation-link-${tab.id}`} href={tab.href + this.props.search}>
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
