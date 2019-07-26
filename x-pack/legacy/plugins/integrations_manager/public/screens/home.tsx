/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  // @ts-ignore (elastic/eui#1557) & (elastic/eui#1262) EuiImage is not exported yet
  EuiImage,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { PLUGIN } from '../../common/constants';
import { IntegrationsGroupedByStatus } from '../../common/types';
import { IntegrationsGridByStatus } from '../components/integration_list_grid';
import { getIntegrationsGroupedByStatus } from '../data';
import { useBreadcrumbs } from '../hooks';
import { linkToListView } from '../routes';

export function Home() {
  useBreadcrumbs([{ text: PLUGIN.TITLE, href: linkToListView() }]);

  const [map, setMap] = useState<IntegrationsGroupedByStatus>({
    installed: [],
    not_installed: [],
  });

  useEffect(() => {
    getIntegrationsGroupedByStatus().then(setMap);
  }, []);

  return (
    <>
      <EuiPage style={{ backgroundColor: 'white', paddingBottom: '8px' }}>
        <EuiPageBody restrictWidth={1200}>
          <Header />
        </EuiPageBody>
      </EuiPage>
      <EuiPage>
        <EuiPageBody restrictWidth={1200}>
          {map ? <IntegrationsGridByStatus map={map} /> : null}
        </EuiPageBody>
      </EuiPage>
    </>
  );
}

function Header() {
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="l">
              <h1>Add Your Data</h1>
            </EuiTitle>
            <EuiText
              style={{
                color: '#69707D', // euiColorDarkShade
              }}
            >
              Some creative copy about integrations goes here.
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiImage
            size="l"
            alt="Illustration of computer"
            url="/plugins/integrations_manager/assets/illustration-kibana-getting-started@2x.png"
            style={{ width: '475px', height: '273px' }}
          />
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
