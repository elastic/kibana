/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import { EuiPage, EuiPageBody, EuiTitle } from '@elastic/eui';
import { IntegrationsGroupedByStatus } from '../../common/types';
import { IntegrationsGridByStatus } from '../components/integration_list_grid';
import { getIntegrationsGroupedByStatus } from '../data';
import { usePluginDependencies } from '../plugin';
import { linkToListView } from '../routes';

export function Home() {
  // TODO: DRY out (or lift up, whatever) breadcrumbs
  const {
    core: { chrome },
  } = usePluginDependencies();

  chrome.setBreadcrumbs([{ text: 'Integrations Manager', href: linkToListView() }]);

  const [map, setMap] = useState<IntegrationsGroupedByStatus>({
    installed: [],
    not_installed: [],
  });

  useEffect(() => {
    getIntegrationsGroupedByStatus().then(setMap);
  }, []);

  return (
    <EuiPage restrictWidth={1200}>
      <EuiPageBody>
        <EuiTitle size="l">
          <h1>Add Your Data</h1>
        </EuiTitle>
        {map ? <IntegrationsGridByStatus map={map} /> : null}
      </EuiPageBody>
    </EuiPage>
  );
}
