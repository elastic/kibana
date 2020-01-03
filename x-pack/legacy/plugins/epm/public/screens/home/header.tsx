/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore (elastic/eui#1557) & (elastic/eui#1262) EuiImage is not exported yet
  EuiImage,
  EuiPage,
  EuiPageBody,
  // @ts-ignore
  EuiSearchBar,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiPageProps,
} from '@elastic/eui';
import React, { Fragment, useState } from 'react';
import styled from 'styled-components';
import { useCore, useLinks } from '../../hooks';

export type HeaderProps = Pick<EuiPageProps, 'restrictWidth'> & {
  onSearch: (userInput: string) => unknown;
};

const Page = styled(EuiPage)`
  padding: 0;
`;

export function Header({ restrictWidth, onSearch }: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const searchBar = (
    <EuiSearchBar
      query={searchTerm}
      key="search-input"
      box={{
        placeholder: 'Find a new package, or one you already use.',
        incremental: true,
      }}
      onChange={({ queryText: userInput }: { queryText: string }) => {
        setSearchTerm(userInput);
        onSearch(userInput);
      }}
    />
  );

  const left = (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem>
        <HeroCopy />
        <EuiSpacer size="xl" />
        <EuiFlexGroup>
          <EuiFlexItem grow={4}>{searchBar}</EuiFlexItem>
          <EuiFlexItem grow={2} />
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
  const right = <HeroImage />;

  return (
    <Page>
      <EuiPageBody restrictWidth={restrictWidth}>
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={1}>{left}</EuiFlexItem>
          <EuiFlexItem grow={1}>{right}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageBody>
    </Page>
  );
}

function HeroCopy() {
  const { theme } = useCore();
  const Subtitle = styled(EuiText)`
    color: ${theme.eui.euiColorDarkShade};
  `;

  return (
    <Fragment>
      <EuiTitle size="l">
        <h1>Add Your Data</h1>
      </EuiTitle>
      <Subtitle>Some creative copy about packages goes here.</Subtitle>
    </Fragment>
  );
}

function HeroImage() {
  const { toAssets } = useLinks();
  const FlexGroup = styled(EuiFlexGroup)`
    margin-bottom: -2px; // puts image directly on EuiHorizontalRule
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
