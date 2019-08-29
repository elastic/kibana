/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import React from 'react';
import { InternalCoreStart } from 'src/core/public';
import { useKibanaCore } from '../../../../../observability/public';
import { getAPMHref } from '../../shared/Links/apm/APMLink';
import { Breadcrumb, ProvideBreadcrumbs } from './ProvideBreadcrumbs';
import { routes } from './route_config';

interface Props {
  location: Location;
  breadcrumbs: Breadcrumb[];
  core: InternalCoreStart;
}

function getTitleFromBreadCrumbs(breadcrumbs: Breadcrumb[]) {
  return breadcrumbs
    .map(({ value }) => value)
    .reverse()
    .join(' | ');
}

class UpdateBreadcrumbsComponent extends React.Component<Props> {
  public updateHeaderBreadcrumbs() {
    const breadcrumbs = this.props.breadcrumbs.map(({ value, match }) => ({
      text: value,
      href: getAPMHref(match.url, this.props.location.search)
    }));

    document.title = getTitleFromBreadCrumbs(this.props.breadcrumbs);
    this.props.core.chrome.setBreadcrumbs(breadcrumbs);
  }

  public componentDidMount() {
    this.updateHeaderBreadcrumbs();
  }

  public componentDidUpdate() {
    this.updateHeaderBreadcrumbs();
  }

  public render() {
    return null;
  }
}

export function UpdateBreadcrumbs() {
  const core = useKibanaCore();
  return (
    <ProvideBreadcrumbs
      routes={routes}
      render={({ breadcrumbs, location }) => (
        <UpdateBreadcrumbsComponent
          breadcrumbs={breadcrumbs}
          location={location}
          core={core}
        />
      )}
    />
  );
}
