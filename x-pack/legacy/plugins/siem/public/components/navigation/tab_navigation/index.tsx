/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiTab, EuiTabs, EuiLink } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import classnames from 'classnames';
import { Location } from 'history';
import { RisonValue, encode } from 'rison-node';
import { trackUiAction as track, METRIC_TYPE } from '../../../lib/track_usage';

import {
  getParamFromQueryString,
  replaceStateKeyInQueryString,
  getQueryStringFromLocation,
  getCurrentLocation,
} from '../../url_state/helpers';
import { HostsTableType } from '../../../store/hosts/model';
import { decodeRison, isRisonObject } from '../../ml/conditional_links/rison_helpers';
import { CONSTANTS } from '../../url_state/constants';
import {
  LOCATION_MAPPED_TO_DEFAULT_TAB,
  LOCATION_MAPPED_TO_TABS,
  LocationTypes,
  LocationMappedToDefaultTab,
} from '../../url_state/types';
import { NetworkTableType, IpDetailsTableType } from '../../../store/network/model';

export type SiemPageType = HostsTableType | NetworkTableType | IpDetailsTableType;

export type SiemTableType = HostsTableType | NetworkTableType | IpDetailsTableType;
export interface NavTab {
  id: SiemPageType;
  name: string;
  href: string;
  disabled: boolean;
}
interface TabNavigationRouteProps {
  location: Location;
}

export interface TabNavigationComponentProps {
  navTabs: NavTab[];
  display?: 'default' | 'condensed' | undefined;
  showBorder?: boolean;
  navigationType?: 'table' | undefined;
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

enum NavigationType {
  global = 'global',
  table = 'table',
}

TabContainer.displayName = 'TabContainer';

interface TabNavigationState {
  selectedTabId: string;
}

export class TabNavigation extends React.PureComponent<TabNavigationProps, TabNavigationState> {
  constructor(props: TabNavigationProps) {
    super(props);
    const pathname = props.location.pathname;
    const search = props.location.search;
    const selectedTabId: string =
      props.navigationType !== NavigationType.table
        ? this.mapLocationToTab(pathname)
        : this.mapQueryStringToTab(pathname, search);
    this.state = { selectedTabId };
  }
  public componentWillReceiveProps(nextProps: TabNavigationProps): void {
    const pathname = nextProps.location.pathname;
    const search = nextProps.location.search;
    const selectedTabId =
      this.props.navigationType !== NavigationType.table
        ? this.mapLocationToTab(pathname)
        : this.mapQueryStringToTab(pathname, search);

    if (this.state.selectedTabId !== selectedTabId) {
      this.setState(prevState => ({
        ...prevState,
        selectedTabId,
      }));
    }
  }
  public render() {
    let { display } = this.props;
    display = display || 'condensed';
    return (
      <EuiTabs display={display} size="m">
        {this.renderTabs()}
      </EuiTabs>
    );
  }

  public mapLocationToTab = (pathname: string) =>
    this.props.navTabs.reduce((res, tab) => {
      if (pathname.includes(tab.id)) {
        res = tab.id;
      }
      return res;
    }, '');

  private mapQueryStringToTab = (pathname: string, search: string): string => {
    const { navTabs } = this.props;
    const defaultSelectedTab = navTabs[0].id;

    if (!search) return defaultSelectedTab;
    const queryString = search.substring(1);

    const kqlQuery = getParamFromQueryString(queryString, CONSTANTS.kqlQuery) || '';
    const value: RisonValue = decodeRison(kqlQuery);
    const tabId =
      isRisonObject(value) && value.selectedTab ? value.selectedTab : defaultSelectedTab;
    const currentLocation: LocationTypes = getCurrentLocation(pathname);
    const tabs: NavTab[] = currentLocation
      ? LOCATION_MAPPED_TO_TABS[currentLocation]
      : defaultSelectedTab;
    if (tabs.find((t: NavTab) => t.id === tabId)) {
      return tabId;
    } else return defaultSelectedTab;
  };

  private replaceKqlSelectedTab = (kqlQuery: string, tabId: SiemTableType): string => {
    const value: RisonValue = decodeRison(kqlQuery);
    if (isRisonObject(value)) {
      value.selectedTab = tabId;
      return encode(value);
    } else {
      return kqlQuery;
    }
  };

  private replaceKqlQueryString = (
    kqlQueryString: string,
    queryString: string,
    tabId: SiemTableType
  ) => {
    const newKqlString = kqlQueryString
      ? this.replaceKqlSelectedTab(kqlQueryString, tabId)
      : encode({
          selectedTab: tabId,
        });
    return (
      '?' + replaceStateKeyInQueryString(CONSTANTS.kqlQuery, decodeRison(newKqlString))(queryString)
    );
  };

  private genSelectedTabQueryString = (tabId: SiemPageType | SiemTableType) => {
    const { navigationType, location } = this.props;

    const queryString = getQueryStringFromLocation(location);
    const kqlQueryString = getParamFromQueryString(queryString, CONSTANTS.kqlQuery);

    if (!kqlQueryString) return location.search;
    if (navigationType === NavigationType.table) {
      return this.replaceKqlQueryString(kqlQueryString, queryString, tabId);
    } else {
      const currentLocation: keyof LocationMappedToDefaultTab = `${tabId}.page`;
      const defaultTabId = LOCATION_MAPPED_TO_DEFAULT_TAB[currentLocation];
      return this.replaceKqlQueryString(kqlQueryString, queryString, defaultTabId);
    }
  };

  private renderTabs = () => {
    const { navTabs, showBorder } = this.props;
    return navTabs.map((tab: NavTab) => (
      <TabContainer
        className={classnames({ euiTab: true, showBorder })}
        key={`navigation-${tab.id}`}
      >
        <EuiLink
          data-test-subj={`navigation-link-${tab.id}`}
          href={tab.href + this.genSelectedTabQueryString(tab.id)}
        >
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
  };
}
