/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiTab, EuiTabs, EuiLink } from '@elastic/eui';
import { get, getOr } from 'lodash/fp';
import { Location } from 'history';
import * as React from 'react';
import styled from 'styled-components';
import classnames from 'classnames';

import { trackUiAction as track, METRIC_TYPE, TELEMETRY_EVENT } from '../../../lib/track_usage';
import { HostsTableType } from '../../../store/hosts/model';
import { UrlInputsModel } from '../../../store/inputs/model';
import { CONSTANTS } from '../../url_state/constants';
import { KqlQuery, URL_STATE_KEYS, KeyUrlState } from '../../url_state/types';
import { NavTab, NavMatchParams, TabNavigationProps } from '../type';

import {
  replaceQueryStringInLocation,
  replaceStateKeyInQueryString,
  getQueryStringFromLocation,
} from '../../url_state/helpers';

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
    const pathname = props.location.pathname;
    const match = props.match;
    const selectedTabId = this.mapLocationToTab(pathname, match);
    this.state = { selectedTabId };
  }
  public componentWillReceiveProps(nextProps: TabNavigationProps): void {
    const pathname = nextProps.location.pathname;
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
          <EuiLink
            data-test-subj={`navigation-link-${tab.id}`}
            href={tab.href + this.getSearch(tab)}
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

  private getSearch = (tab: NavTab): string => {
    return URL_STATE_KEYS[tab.urlKey].reduce<Location>(
      (myLocation: Location, urlKey: KeyUrlState) => {
        let urlStateToReplace: UrlInputsModel | KqlQuery | string = this.props[
          CONSTANTS.timelineId
        ];
        if (urlKey === CONSTANTS.kqlQuery && tab.urlKey === 'host') {
          urlStateToReplace = tab.isDetailPage ? this.props.hostDetails : this.props.hosts;
        } else if (urlKey === CONSTANTS.kqlQuery && tab.urlKey === 'network') {
          urlStateToReplace = this.props.network;
        } else if (urlKey === CONSTANTS.timerange) {
          urlStateToReplace = this.props[CONSTANTS.timerange];
        }
        myLocation = replaceQueryStringInLocation(
          myLocation,
          replaceStateKeyInQueryString(urlKey, urlStateToReplace)(
            getQueryStringFromLocation(myLocation)
          )
        );
        return myLocation;
      },
      {
        ...this.props.location,
        search: '',
      }
    ).search;
  };
}
