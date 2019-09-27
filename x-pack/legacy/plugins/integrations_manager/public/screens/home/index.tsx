/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import { EuiHorizontalRule, EuiPage, EuiPageBody, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';

import { PLUGIN } from '../../../common/constants';
import { CategorySummaryItem, IntegrationList } from '../../../common/types';
import { IntegrationListGrid } from '../../components/integration_list_grid';
import { useBreadcrumbs, useLinks } from '../../hooks';
import { CategoryFacets } from './category_facets';
import { Header } from './header';
import {
  useCategories,
  useCategoryIntegrations,
  useAllIntegrations,
  useLocalSearch,
  useInstalledIntegrations,
} from './hooks';
import { SearchIntegrations } from './search_integrations';

export const FullBleedPage = styled(EuiPage)`
  padding: 0;
`;

export function Home() {
  const maxContentWidth = 1200;
  const { toListView } = useLinks();
  useBreadcrumbs([{ text: PLUGIN.TITLE, href: toListView() }]);

  const state = useHomeState();
  const body = state.searchTerm ? (
    <SearchIntegrations
      searchTerm={state.searchTerm}
      localSearchRef={state.localSearchRef}
      allIntegrations={state.allIntegrations}
    />
  ) : (
    <Fragment>
      <InstalledIntegrations list={state.installedIntegrations} />
      {state.installedIntegrations.length ? <EuiHorizontalRule margin="l" /> : null}
      <AvailableIntegrations {...state} />
    </Fragment>
  );

  return (
    <Fragment>
      <Header restrictWidth={maxContentWidth} onSearch={state.setSearchTerm} />
      <EuiHorizontalRule margin="none" />
      <FullBleedPage>
        <EuiPageBody restrictWidth={maxContentWidth}>
          <Fragment>
            <EuiSpacer size="l" />
            {body}
          </Fragment>
        </EuiPageBody>
      </FullBleedPage>
    </Fragment>
  );
}

type HomeState = ReturnType<typeof useHomeState>;

export function useHomeState() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useCategories();
  const [categoryIntegrations, setCategoryIntegrations] = useCategoryIntegrations(selectedCategory);
  const [allIntegrations, setAllIntegrations] = useAllIntegrations(
    selectedCategory,
    categoryIntegrations
  );
  const localSearchRef = useLocalSearch(allIntegrations);
  const [installedIntegrations, setInstalledIntegrations] = useInstalledIntegrations(
    allIntegrations
  );

  return {
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    categories,
    setCategories,
    allIntegrations,
    setAllIntegrations,
    installedIntegrations,
    localSearchRef,
    setInstalledIntegrations,
    categoryIntegrations,
    setCategoryIntegrations,
  };
}

function InstalledIntegrations({ list }: { list: IntegrationList }) {
  const title = 'Your Integrations';

  return <IntegrationListGrid title={title} list={list} />;
}

function AvailableIntegrations({
  allIntegrations,
  categories,
  categoryIntegrations,
  selectedCategory,
  setSelectedCategory,
}: HomeState) {
  const title = 'Available Integrations';
  const noFilter = {
    id: '',
    title: 'All',
    count: allIntegrations.length,
  };

  const controls = (
    <CategoryFacets
      categories={[noFilter, ...categories]}
      selectedCategory={selectedCategory}
      onCategoryChange={({ id }: CategorySummaryItem) => setSelectedCategory(id)}
    />
  );

  return <IntegrationListGrid title={title} controls={controls} list={categoryIntegrations} />;
}
