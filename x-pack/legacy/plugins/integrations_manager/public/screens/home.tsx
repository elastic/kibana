/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  // @ts-ignore (elastic/eui#1557) & (elastic/eui#1262) EuiImage is not exported yet
  EuiImage,
  EuiPage,
  EuiPageBody,
  EuiPageWidthProps,
  EuiSpacer,
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

  const FullBleedPage = styled(EuiPage)`
    padding: 0;
  `;

  const availableTitle = 'Available Integrations';
  const installedTitle = 'Your Integrations';
  const installedIntegrations = list.filter(({ status }) => status === 'installed');

  return (
    <Fragment>
      <FullBleedPage>
        <EuiPageBody restrictWidth={restrictWidth}>
          <Header />
        </EuiPageBody>
      </FullBleedPage>
      <EuiHorizontalRule margin="none" />
      <FullBleedPage>
        <EuiPageBody restrictWidth={restrictWidth}>
          <Fragment>
            <EuiSpacer size="l" />
            <IntegrationListGrid title={installedTitle} list={installedIntegrations} />
            <EuiHorizontalRule margin="l" />
            <IntegrationListGrid title={availableTitle} list={list} />
          </Fragment>
        </EuiPageBody>
      </FullBleedPage>
    </Fragment>
  );
}

function Header() {
  return (
    <EuiFlexGroup gutterSize="none">
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
    <EuiFlexGroup alignItems="center" gutterSize="none">
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
  const FlexGroup = styled(EuiFlexGroup)`
    margin-bottom: -6px; // puts image directly on EuiHorizontalRule
  `;

  return (
    <FlexGroup gutterSize="none" justifyContent="flexEnd">
      <EuiImage
        alt="Illustration of computer"
        url={toAssets('illustration_kibana_getting_started@2x.png')}
      />
    </FlexGroup>
  );
}
