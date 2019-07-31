/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore (elastic/eui#1557) & (elastic/eui#1262) EuiImage is not exported yet
  EuiImage,
  EuiPage,
  EuiPageBody,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { PLUGIN, STATUS_INSTALLED, STATUS_NOT_INSTALLED } from '../../common/constants';
import { IntegrationsGroupedByStatus } from '../../common/types';
import { IntegrationsGridByStatus } from '../components/integration_list_grid';
import { getIntegrationsGroupedByStatus } from '../data';
import { useBreadcrumbs, useLinks } from '../hooks';

export function Home() {
  const { toListView } = useLinks();
  useBreadcrumbs([{ text: PLUGIN.TITLE, href: toListView() }]);

  const [map, setMap] = useState<IntegrationsGroupedByStatus>({
    [STATUS_INSTALLED]: [],
    [STATUS_NOT_INSTALLED]: [],
  });

  useEffect(() => {
    getIntegrationsGroupedByStatus().then(setMap);
  }, []);

  return (
    <>
      <EuiPage style={{ borderBottom: '1px solid #D3DAE6', paddingBottom: '7px' }}>
        <EuiPageBody restrictWidth={1200}>
          <Header />
        </EuiPageBody>
      </EuiPage>
      <EuiPage>
        <EuiPageBody restrictWidth={1200}>
          <IntegrationsGridByStatus map={map} />
        </EuiPageBody>
      </EuiPage>
    </>
  );
}

function Header() {
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <HeroCopy />
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <HeroImage />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function HeroCopy() {
  return (
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
  );
}

function HeroImage() {
  const { toAssets } = useLinks();
  return (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiImage
        alt="Illustration of computer"
        url={toAssets('illustration_kibana_getting_started@2x.png')}
        style={{ width: '475px', height: '273px' }}
      />
    </EuiFlexGroup>
  );
}
