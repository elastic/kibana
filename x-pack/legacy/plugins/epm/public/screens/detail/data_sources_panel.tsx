/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiTitle, EuiButton, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { Redirect } from 'react-router-dom';
import { useLinks, useGetPackageInstallStatus } from '../../hooks';
import { InstallStatus } from '../../types';

interface DataSourcesPanelProps {
  name: string;
  version: string;
}
export const DataSourcesPanel = ({ name, version }: DataSourcesPanelProps) => {
  const { toAddDataSourceView, toDetailView } = useLinks();
  const packageDataSourceUrl = toAddDataSourceView({ name, version });
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const packageInstallStatus = getPackageInstallStatus(name);
  // if they arrive at this page and the package is not installed, send them to overview
  // this happens if they arrive with a direct url or they uninstall while on this tab
  if (packageInstallStatus !== InstallStatus.installed)
    return (
      <Redirect
        to={toDetailView({
          name,
          version,
          withAppRoot: false,
        })}
      />
    );
  return (
    <Fragment>
      <EuiTitle size="xs">
        <span>Data Sources</span>
      </EuiTitle>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton href={packageDataSourceUrl} size="s">
            Add data source
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};
