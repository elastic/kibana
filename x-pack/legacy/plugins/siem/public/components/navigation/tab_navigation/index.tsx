/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiTab, EuiTabs, EuiLink } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { getHostsUrl, getNetworkUrl, getOverviewUrl, getTimelinesUrl } from '../../link_to';
import { trackUiAction as track, METRIC_TYPE } from '../../../lib/track_usage';

import * as i18n from '../translations';

interface NavTab {
  id: string;
  name: string;
  href: string;
  disabled: boolean;
}

interface TabNavigationProps {
  location: string;
  search: string;
}

const navTabs: NavTab[] = [
  {
    id: 'overview',
    name: i18n.OVERVIEW,
    href: getOverviewUrl(),
    disabled: false,
  },
  {
    id: 'hosts',
    name: i18n.HOSTS,
    href: getHostsUrl(),
    disabled: false,
  },
  {
    id: 'network',
    name: i18n.NETWORK,
    href: getNetworkUrl(),
    disabled: false,
  },
  {
    id: 'timelines',
    name: i18n.TIMELINES,
    href: getTimelinesUrl(),
    disabled: false,
  },
];

const TabContainer = styled.div`
  .euiLink {
    color: inherit !important;
  }
`;

interface TabNavigationState {
  selectedTabId: string;
}

export class TabNavigation extends React.PureComponent<TabNavigationProps, TabNavigationState> {
  constructor(props: TabNavigationProps) {
    super(props);
    const pathname = props.location;
    const selectedTabId = this.mapLocationToTab(pathname);
    this.state = { selectedTabId };
  }
  public componentWillReceiveProps(nextProps: TabNavigationProps): void {
    const pathname = nextProps.location;
    const selectedTabId = this.mapLocationToTab(pathname);

    if (this.state.selectedTabId !== selectedTabId) {
      this.setState(prevState => ({
        ...prevState,
        selectedTabId,
      }));
    }
  }
  public render() {
    return <EuiTabs display="condensed">{this.renderTabs()}</EuiTabs>;
  }

  public mapLocationToTab = (pathname: string) =>
    navTabs.reduce((res, tab) => {
      if (pathname.includes(tab.id)) {
        res = tab.id;
      }
      return res;
    }, '');

  private renderTabs = () =>
    navTabs.map((tab: NavTab) => (
      <TabContainer className="euiTab" key={`navigation-${tab.id}`}>
        <EuiLink data-test-subj={`navigation-link-${tab.id}`} href={tab.href + this.props.search}>
          <EuiTab
            data-href={tab.href}
            data-test-subj={`navigation-${tab.id}`}
            disabled={tab.disabled}
            isSelected={this.state.selectedTabId === tab.id}
            onClick={() => {
              track(METRIC_TYPE.CLICK, `tab_${tab.id}`);
            }}
          >
            {tab.name}
          </EuiTab>
        </EuiLink>
      </TabContainer>
    ));
}
