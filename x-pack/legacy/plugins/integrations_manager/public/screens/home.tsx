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
  // @ts-ignore (elastic/eui#1557) & (elastic/eui#1262) EuiSearchBar is not exported yet
  EuiSearchBar,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import * as JsSearch from 'js-search';
import styled from 'styled-components';
import { PLUGIN } from '../../common/constants';
import {
  CategorySummaryItem,
  CategorySummaryList,
  IntegrationList,
  IntegrationListItem,
} from '../../common/types';
import { IntegrationListGrid } from '../components/integration_list_grid';
import { getCategories, getIntegrations } from '../data';
import { useBreadcrumbs, useCore, useLinks } from '../hooks';

const FullBleedPage = styled(EuiPage)`
  padding: 0;
  background-color: ${p => p.theme.eui.euiColorLightestShade};
`;

const searchModel = new JsSearch.Search('name');
['description', 'name', 'title'].forEach(index => searchModel.addIndex(index));

export function Home() {
  const { toListView } = useLinks();
  useBreadcrumbs([{ text: PLUGIN.TITLE, href: toListView() }]);

  const maxContentWidth = 1200;
  const { bar, term, results } = useSearch();

  return (
    <Fragment>
      <Header restrictWidth={maxContentWidth} SearchBar={bar} />
      <EuiHorizontalRule margin="none" />
      <FullBleedPage>
        <EuiPageBody restrictWidth={maxContentWidth}>
          <Fragment>
            <EuiSpacer size="l" />
            {term ? <SearchResultsGrid term={term} results={results} /> : <IntegrationLists />}
          </Fragment>
        </EuiPageBody>
      </FullBleedPage>
    </Fragment>
  );
}

function useSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [allIntegrations, setAllIntegrations] = useState<IntegrationList>([]);
  const [searchResults, setSearchResults] = useState<IntegrationList>([]);

  useEffect(() => {
    getIntegrations().then(results => {
      setAllIntegrations(results);
      searchModel.addDocuments(results);
    });
  }, []);

  const placeholder = 'Find a new package, or one you already use.';
  const SearchBar = (
    <EuiSearchBar
      box={{
        placeholder,
        incremental: true,
      }}
      onChange={({ queryText }: { queryText: string }) => {
        setSearchTerm(queryText);
        const results = searchModel.search(queryText);
        const ids = results.map(value => (value as IntegrationListItem).name);
        const filtered = allIntegrations.filter(o => ids.includes(o.name));
        setSearchResults(filtered);
      }}
    />
  );

  return {
    bar: SearchBar,
    term: searchTerm,
    results: searchResults,
  };
}

function IntegrationLists() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [list, setList] = useState<IntegrationList>([]);

  useEffect(() => {
    getIntegrations({ category: selectedCategory }).then(results => {
      setList(results);
    });
  }, [selectedCategory]);

  if (!list) return null;
  const installedIntegrations = list.filter(({ status }) => status === 'installed');

  return (
    <Fragment>
      <InstalledListGrid list={installedIntegrations} />
      {installedIntegrations.length ? <EuiHorizontalRule margin="l" /> : null}
      <AvailableListGrid list={list} onCategoryChange={({ id }) => setSelectedCategory(id)} />
    </Fragment>
  );
}

type HeaderProps = EuiPageWidthProps & {
  SearchBar: React.ReactNode;
};

function Header({ restrictWidth, SearchBar }: HeaderProps) {
  const left = (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem>
        <HeroCopy />
        <EuiSpacer size="xl" />
        <EuiFlexGroup>
          <EuiFlexItem grow={4}>{SearchBar}</EuiFlexItem>
          <EuiFlexItem grow={2} />
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
  const right = <HeroImage />;

  return (
    <FullBleedPage>
      <EuiPageBody restrictWidth={restrictWidth}>
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={1}>{left}</EuiFlexItem>
          <EuiFlexItem grow={1}>{right}</EuiFlexItem>
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
    <Fragment>
      <EuiTitle size="l">
        <h1>Add Your Data</h1>
      </EuiTitle>
      <Subtitle>Some creative copy about integrations goes here.</Subtitle>
    </Fragment>
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

interface SearchResultsGridProps {
  term: string;
  results: IntegrationList;
}

function SearchResultsGrid({ term, results }: SearchResultsGridProps) {
  const title = 'Search results';

  return (
    <IntegrationListGrid
      title={title}
      list={results}
      showInstalledBadge={true}
      controls={
        <EuiTitle>
          <EuiText>
            {results.length} results for "{term}"
          </EuiText>
        </EuiTitle>
      }
    />
  );
}
