/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiTitle, EuiButton, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { useLinks } from '../../hooks';

interface DataSourcesPanelProps {
  name: string;
  version: string;
}
export const DataSourcesPanel = ({ name, version }: DataSourcesPanelProps) => {
  const { toAddDataSourceView } = useLinks();
  const packageDataSourceUrl = toAddDataSourceView({ name, version });
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
