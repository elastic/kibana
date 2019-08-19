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
  navTabs: NavTab[];
  display?: 'default' | 'condensed' | undefined;
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
    const { location } = this.props;
    if (location.pathname) {
      setBreadcrumbs(location.pathname);
    }
  }

  public componentWillReceiveProps(nextProps: Readonly<RouteComponentProps>): void {
    if (this.props.location.pathname !== nextProps.location.pathname) {
      setBreadcrumbs(nextProps.location.pathname);
    }
  }

  public render() {
    const { location, ...rest } = this.props;
    return <TabNavigation location={location.pathname} search={location.search} {...rest} />;
  }
}

export const SiemNavigation = withRouter(SiemNavigationComponent);
