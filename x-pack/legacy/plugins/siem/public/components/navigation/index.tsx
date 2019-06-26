/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { setBreadcrumbs } from './breadcrumbs';
import { TabNavigation } from './tab_navigation';

export class SiemNavigationComponent extends React.Component<RouteComponentProps> {
  public shouldComponentUpdate(nextProps: Readonly<RouteComponentProps>): boolean {
    if (this.props.location.pathname === nextProps.location.pathname) {
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
    const { location } = this.props;
    return <TabNavigation location={location.pathname} />;
  }
}

export const SiemNavigation = withRouter(SiemNavigationComponent);
