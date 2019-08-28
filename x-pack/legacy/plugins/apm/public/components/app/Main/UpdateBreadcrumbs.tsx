/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { last } from 'lodash';
import React from 'react';
import { InternalCoreStart } from 'src/core/public';
import { useCore } from '../../../hooks/useCore';
import { getAPMHref } from '../../shared/Links/apm/APMLink';
import { Breadcrumb, ProvideBreadcrumbs } from './ProvideBreadcrumbs';
import { routes } from './route_config';

interface Props {
  location: Location;
  breadcrumbs: Breadcrumb[];
  core: InternalCoreStart;
}

class UpdateBreadcrumbsComponent extends React.Component<Props> {
  public updateHeaderBreadcrumbs() {
    const breadcrumbs = this.props.breadcrumbs.map(({ value, match }) => ({
      text: value,
      href: getAPMHref(match.url, this.props.location.search)
    }));

    const current = last(breadcrumbs) || { text: '' };
    document.title = current.text;
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
  const core = useCore();
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
