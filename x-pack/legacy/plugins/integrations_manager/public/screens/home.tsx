/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useEffect } from 'react';
import {
  EuiFacetButton,
  EuiFacetGroup,
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
import { CategorySummaryItem, CategorySummaryList, IntegrationList } from '../../common/types';
import { IntegrationListGrid } from '../components/integration_list_grid';
import { getCategories, getIntegrations } from '../data';
import { useBreadcrumbs, useCore, useLinks } from '../hooks';

const FullBleedPage = styled(EuiPage)`
  padding: 0;
  background-color: ${p => p.theme.eui.euiColorLightestShade};
`;

export function Home() {
  const { toListView } = useLinks();
  useBreadcrumbs([{ text: PLUGIN.TITLE, href: toListView() }]);

  const [list, setList] = useState<IntegrationList>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  useEffect(() => {
    getIntegrations({ category: selectedCategory }).then(setList);
  }, [selectedCategory]);

  if (!list) return null;
  const installedIntegrations = list.filter(({ status }) => status === 'installed');

  const maxContentWidth = 1200;
  return (
    <Fragment>
      <Header restrictWidth={maxContentWidth} />
      <EuiHorizontalRule margin="none" />
      <FullBleedPage>
        <EuiPageBody restrictWidth={maxContentWidth}>
          <Fragment>
            <EuiSpacer size="l" />
            <InstalledListGrid list={installedIntegrations} />
            {installedIntegrations.length ? <EuiHorizontalRule margin="l" /> : null}
            <AvailableListGrid
              list={list}
              onCategoryChange={category => {
                setSelectedCategory(category.id);
              }}
            />
          </Fragment>
        </EuiPageBody>
      </FullBleedPage>
    </Fragment>
  );
}

function Header({ restrictWidth }: EuiPageWidthProps) {
  return (
    <FullBleedPage>
      <EuiPageBody restrictWidth={restrictWidth}>
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={1}>
            <HeroCopy />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <HeroImage />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageBody>
    </FullBleedPage>
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

interface AvailableListGridProps {
  list: IntegrationList;
  onCategoryChange: (item: CategorySummaryItem) => any;
}

function AvailableListGrid({ list, onCategoryChange }: AvailableListGridProps) {
  const [categories, setCategories] = useState<CategorySummaryList>([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const noFilter: CategorySummaryItem = {
    id: '',
    title: 'All',
    count: list.length,
  };

  const availableTitle = 'Available Integrations';
  const controls = (
    <EuiFacetGroup>
      {[noFilter, ...categories].map(category => (
        <EuiFacetButton
          isSelected={category.id === selectedCategory}
          key={category.id}
          id={category.id}
          quantity={category.count}
          onClick={() => {
            onCategoryChange(category);
            setSelectedCategory(category.id);
          }}
        >
          {category.title}
        </EuiFacetButton>
      ))}
    </EuiFacetGroup>
  );

  return <IntegrationListGrid title={availableTitle} controls={controls} list={list} />;
}

interface InstalledListGridProps {
  list: IntegrationList;
}

function InstalledListGrid({ list }: InstalledListGridProps) {
  const installedTitle = 'Your Integrations';

  return <IntegrationListGrid title={installedTitle} list={list} controls={<div />} />;
}
