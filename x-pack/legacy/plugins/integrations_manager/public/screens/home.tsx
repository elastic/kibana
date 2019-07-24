/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { getIntegrationsGroupedByStatus } from '../data';
import { IntegrationsGridByStatus } from '../components/integration_list_grid';
import { IntegrationsGroupedByStatus } from '../../common/types';

export function Home() {
  const [map, setMap] = useState<IntegrationsGroupedByStatus>({
    installed: [],
    not_installed: [],
  });

  useEffect(() => {
    getIntegrationsGroupedByStatus().then(setMap);
  }, []);

  return (
    <EuiPanel paddingSize="l">
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle>
            <h1>Elastic Integrations Manager</h1>
          </EuiTitle>
          {map ? <IntegrationsGridByStatus map={map} /> : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
