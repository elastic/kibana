/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiTab, EuiTabs, EuiLink } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import classnames from 'classnames';
import { trackUiAction as track, METRIC_TYPE } from '../../../lib/track_usage';

import { TabNavigationComponentProps } from '..';

export interface NavTab {
  id: string;
  name: string;
  href: string;
  disabled: boolean;
}
interface TabNavigationRouteProps {
  location: string;
  search: string;
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
    let { display } = this.props;
    display = display || 'condensed';
    return (
      <EuiTabs display={display} size="s">
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

  private renderTabs = () =>
    this.props.navTabs.map((tab: NavTab) => (
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
              track(METRIC_TYPE.CLICK, `tab_${tab.id}`);
            }}
          >
            {tab.name}
          </EuiTab>
        </EuiLink>
      </TabContainer>
    ));
}
