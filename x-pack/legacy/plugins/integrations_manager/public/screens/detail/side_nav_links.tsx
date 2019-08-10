/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { IntegrationInfo } from '../../../common/types';
import { DetailViewPanelName } from '../../';
import { useLinks } from '../../hooks';

export type NavLinkProps = Pick<IntegrationInfo, 'name' | 'version'> & {
  active: DetailViewPanelName;
};

export function SideNavLinks({ name, version, active }: NavLinkProps) {
  const { toDetailView } = useLinks();
  const overviewLink = toDetailView({ name, version, panel: 'overview' });
  const assetsLink = toDetailView({ name, version, panel: 'assets' });
  const sourcesLink = toDetailView({ name, version, panel: 'data-sources' });
  const activeStyles = { fontWeight: 600 };
  return (
    <Fragment>
      <EuiButtonEmpty
        href={overviewLink}
        contentProps={{ style: { justifyContent: 'start' } }}
        style={active === 'overview' ? activeStyles : {}}
      >
        Overview
      </EuiButtonEmpty>
      <EuiButtonEmpty
        href={assetsLink}
        contentProps={{ style: { justifyContent: 'start' } }}
        style={active === 'assets' ? activeStyles : {}}
      >
        Assets
      </EuiButtonEmpty>
      <EuiButtonEmpty
        href={sourcesLink}
        contentProps={{ style: { justifyContent: 'start' } }}
        style={active === 'data-sources' ? activeStyles : {}}
      >
        Data Sources
      </EuiButtonEmpty>
    </Fragment>
  );
}
