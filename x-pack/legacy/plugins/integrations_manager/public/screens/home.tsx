/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore (elastic/eui#1557) & (elastic/eui#1262) EuiImage is not exported yet
  EuiImage,
  EuiPage,
  EuiPageBody,
  EuiPageWidthProps,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import styled from 'styled-components';
import { PLUGIN } from '../../common/constants';
import { IntegrationsGroupedByStatus } from '../../common/types';
import { IntegrationsGridByStatus } from '../components/integration_list_grid';
import { getIntegrationsGroupedByStatus } from '../data';
import { useBreadcrumbs, useCore, useLinks } from '../hooks';

export function Home() {
  const { toListView } = useLinks();
  useBreadcrumbs([{ text: PLUGIN.TITLE, href: toListView() }]);

  const [map, setMap] = useState<IntegrationsGroupedByStatus>({
    installed: [],
    not_installed: [],
  });

  useEffect(() => {
    getIntegrationsGroupedByStatus().then(setMap);
  }, []);

  return <HomeLayout map={map} restrictWidth={1200} />;
}

type LayoutProps = {
  map: IntegrationsGroupedByStatus;
} & EuiPageWidthProps;
function HomeLayout(props: LayoutProps) {
  const { map, restrictWidth } = props;
  const { theme } = useCore();
  const FullWidthHeader = styled(EuiPage)`
    border-bottom: ${theme.eui.euiBorderThin};
    padding-bottom: ${theme.eui.paddingSizes.s};
  `;

  return (
    <Fragment>
      <FullWidthHeader>
        <EuiPageBody restrictWidth={restrictWidth}>
          <Header />
        </EuiPageBody>
      </FullWidthHeader>
      <EuiPage>
        <EuiPageBody restrictWidth={restrictWidth}>
          <IntegrationsGridByStatus map={map} />
        </EuiPageBody>
      </EuiPage>
    </Fragment>
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
  const { theme } = useCore();
  const Subtitle = styled(EuiText)`
    color: ${theme.eui.euiColorDarkShade};
  `;

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiTitle size="l">
          <h1>Add Your Data</h1>
        </EuiTitle>
        <Subtitle>Some creative copy about integrations goes here.</Subtitle>
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
      />
    </EuiFlexGroup>
  );
}
