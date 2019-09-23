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
import { IntegrationList } from '../../common/types';
import { IntegrationListGrid } from '../components/integration_list_grid';
import { getIntegrations } from '../data';
import { useBreadcrumbs, useCore, useLinks } from '../hooks';

export function Home() {
  const { toListView } = useLinks();
  useBreadcrumbs([{ text: PLUGIN.TITLE, href: toListView() }]);

  const [list, setList] = useState<IntegrationList>([]);

  useEffect(() => {
    getIntegrations().then(setList);
  }, []);

  return <HomeLayout list={list} restrictWidth={1200} />;
}

type LayoutProps = {
  list: IntegrationList;
} & EuiPageWidthProps;
function HomeLayout(props: LayoutProps) {
  const { list, restrictWidth } = props;
  if (!list) return null;

  const { theme } = useCore();
  const FullWidthHeader = styled(EuiPage)`
    border-bottom: ${theme.eui.euiBorderThin};
    padding-bottom: ${theme.eui.paddingSizes.s};
  `;

  const availableTitle = 'Available Integrations';
  const installedTitle = 'Your Integrations';
  const installedIntegrations = list.filter(({ status }) => status === 'installed');

  return (
    <Fragment>
      <FullWidthHeader>
        <EuiPageBody restrictWidth={restrictWidth}>
          <Header />
        </EuiPageBody>
      </FullWidthHeader>
      <EuiPage>
        <EuiPageBody restrictWidth={restrictWidth}>
          <Fragment>
            <IntegrationListGrid title={installedTitle} list={installedIntegrations} />
            <IntegrationListGrid title={availableTitle} list={list} />
          </Fragment>
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
