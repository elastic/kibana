/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { setBreadcrumbs } from './breadcrumbs';
import { TabNavigation, NavTab } from './tab_navigation';

export interface TabNavigationComponentProps {
  navTabs: Record<string, NavTab>;
  display?: 'default' | 'condensed';
  showBorder?: boolean;
}

export class SiemNavigationComponent extends React.Component<
  RouteComponentProps & TabNavigationComponentProps
> {
  public shouldComponentUpdate(nextProps: Readonly<RouteComponentProps>): boolean {
    if (
      this.props.location.pathname === nextProps.location.pathname &&
      this.props.location.search === nextProps.location.search
    ) {
      return false;
    }
    return true;
  }

  public componentWillMount(): void {
    const {
      location,
      match: { params },
    } = this.props;
    if (location.pathname) {
      setBreadcrumbs(location.pathname, params);
    }
  }

  public componentWillReceiveProps(nextProps: Readonly<RouteComponentProps>): void {
    if (this.props.location.pathname !== nextProps.location.pathname) {
      setBreadcrumbs(nextProps.location.pathname, nextProps.match.params);
    }
  }

  public render() {
    const { location, match, navTabs } = this.props;
    return (
      <TabNavigation
        location={location.pathname}
        search={location.search}
        match={match}
        navTabs={navTabs}
      />
    );
  }
}

export const SiemNavigation = withRouter(SiemNavigationComponent);
