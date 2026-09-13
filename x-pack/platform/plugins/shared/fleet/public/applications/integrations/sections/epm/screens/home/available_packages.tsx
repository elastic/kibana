/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { EuiHorizontalRule, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { CardIcon } from '../../../../../../components/package_icon';
import { useBreadcrumbs } from '../../../../hooks';

import { PackageListGrid } from '../../components/package_list_grid';

import { IntegrationPreference } from '../../components/integration_preference';
import { AgentlessFilter } from '../../components/agentless_filter';
import { NoEprCallout } from '../../components/no_epr_callout';

import { CategoryFacets } from './category_facets';

import { categoryExists } from '.';

import { useAvailablePackages } from './hooks/use_available_packages';

import type { ExtendedIntegrationCategory } from './category_facets';
import type { CollectionVariant } from './card_utils';
import { COLLECTION_QUERYPARAM } from './card_utils';

import { CollectionFlyout } from './components/collection_flyout';

export const AvailablePackages: React.FC<{ prereleaseIntegrationsEnabled: boolean }> = ({
  prereleaseIntegrationsEnabled,
}) => {
  useBreadcrumbs('integrations_all');

  const history = useHistory();
  const { search, pathname } = useLocation();

  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const openCollectionGroupId = queryParams.get(COLLECTION_QUERYPARAM) ?? undefined;

  const openCollection = useCallback(
    (groupId: string) => {
      const next = new URLSearchParams(search);
      next.set(COLLECTION_QUERYPARAM, groupId);
      history.replace({ search: next.toString() });
    },
    [history, search]
  );

  const closeCollection = useCallback(() => {
    const next = new URLSearchParams(search);
    next.delete(COLLECTION_QUERYPARAM);
    history.replace({ search: next.toString() });
  }, [history, search]);

  const {
    initialSelectedCategory,
    selectedCategory,
    setCategory,
    allCategories,
    mainCategories,
    preference,
    setPreference,
    onlyAgentlessFilter,
    setOnlyAgentlessFilter,
    isAgentlessEnabled,
    isLoading,
    isLoadingCategories,
    isLoadingAllPackages,
    isLoadingAppendCustomIntegrations,
    eprPackageLoadingError,
    eprCategoryLoadingError,
    searchTerm,
    setSearchTerm,
    setUrlandPushHistory,
    setUrlandReplaceHistory,
    filteredCards,
    allCards,
    availableSubCategories,
    selectedSubCategory,
    setSelectedSubCategory,
  } = useAvailablePackages({ prereleaseIntegrationsEnabled, enableCollectionGrouping: true });

  const onCategoryChange = useCallback(
    ({ id }: { id: string }) => {
      setCategory(id as ExtendedIntegrationCategory);
      setSearchTerm('');
      setSelectedSubCategory(undefined);
      setUrlandPushHistory({
        searchString: '',
        categoryId: id,
        subCategoryId: '',
        onlyAgentless: onlyAgentlessFilter,
      });
    },
    [setCategory, setSearchTerm, setSelectedSubCategory, setUrlandPushHistory, onlyAgentlessFilter]
  );

  const onOnlyAgentlessFilterChange = useCallback(
    (enabled: boolean) => {
      setOnlyAgentlessFilter(enabled);
      setUrlandPushHistory({
        searchString: searchTerm,
        categoryId: selectedCategory,
        subCategoryId: selectedSubCategory || '',
        onlyAgentless: enabled,
      });
    },
    [
      setOnlyAgentlessFilter,
      setUrlandPushHistory,
      searchTerm,
      selectedCategory,
      selectedSubCategory,
    ]
  );

  // Override onCardClick for collection tiles so they open the flyout via URL param
  // instead of navigating to the collection detail page.
  const cardsWithCollectionHandlers = useMemo(
    () =>
      filteredCards.map((card) => {
        if (!card.isCollectionCard) return card;
        return { ...card, onCardClick: () => openCollection(card.name) };
      }),
    [filteredCards, openCollection]
  );

  // Resolve the open collection card from allCards (not filteredCards so it survives
  // category/search filters that may not include the group).
  const openCollectionCard = useMemo(
    () =>
      openCollectionGroupId
        ? allCards.find((c) => c.isCollectionCard && c.name === openCollectionGroupId)
        : undefined,
    [openCollectionGroupId, allCards]
  );

  // Build the return path that member detail pages use to navigate back here with the flyout open.
  const collectionReturnPath = useMemo(
    () =>
      openCollectionGroupId
        ? `${pathname}?${COLLECTION_QUERYPARAM}=${openCollectionGroupId}`
        : undefined,
    [openCollectionGroupId, pathname]
  );

  const collectionVariants: CollectionVariant[] = useMemo(() => {
    if (!openCollectionCard?.groupMembers || !collectionReturnPath) return [];
    return openCollectionCard.groupMembers.map((member) => {
      const returnParams = new URLSearchParams({
        returnAppId: 'integrations',
        returnPath: collectionReturnPath,
      });
      const separator = member.url.includes('?') ? '&' : '?';
      return {
        id: member.id,
        title: member.title,
        description: member.description,
        icon: (
          <CardIcon
            icons={member.icons}
            packageName={member.name}
            version={member.version}
            size="l"
          />
        ),
        href: `${member.url}${separator}${returnParams.toString()}`,
        'data-test-subj': `collectionVariantRow-${member.id}`,
      };
    });
  }, [openCollectionCard, collectionReturnPath]);

  if (!isLoading && !categoryExists(initialSelectedCategory, allCategories)) {
    setUrlandReplaceHistory({
      searchString: searchTerm,
      categoryId: '',
      subCategoryId: '',
      onlyAgentless: onlyAgentlessFilter,
    });
    return null;
  }

  let controls = [
    <EuiFlexItem grow={false}>
      <EuiHorizontalRule margin="m" />
      {isAgentlessEnabled && (
        <>
          <AgentlessFilter
            agentlessFilter={onlyAgentlessFilter}
            onAgentlessFilterChange={onOnlyAgentlessFilterChange}
          />
          <EuiSpacer size="m" />
        </>
      )}
      <IntegrationPreference initialType={preference} onChange={setPreference} />
    </EuiFlexItem>,
  ];

  if (mainCategories) {
    controls = [
      <EuiFlexItem className="eui-yScrollWithShadows">
        <CategoryFacets
          isLoading={isLoading}
          categories={mainCategories}
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
        />
      </EuiFlexItem>,
      ...controls,
    ];
  }

  let noEprCallout;
  if (eprPackageLoadingError || eprCategoryLoadingError) {
    const error = eprPackageLoadingError || eprCategoryLoadingError;
    noEprCallout = <NoEprCallout statusCode={error?.statusCode} />;
  }

  return (
    <>
      <PackageListGrid
        isLoading={isLoadingCategories || isLoadingAllPackages || isLoadingAppendCustomIntegrations}
        controls={controls}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        list={cardsWithCollectionHandlers}
        selectedCategory={selectedCategory}
        setCategory={setCategory}
        categories={mainCategories}
        setUrlandReplaceHistory={setUrlandReplaceHistory}
        setUrlandPushHistory={setUrlandPushHistory}
        callout={noEprCallout}
        showCardLabels={false}
        availableSubCategories={availableSubCategories}
        selectedSubCategory={selectedSubCategory}
        setSelectedSubCategory={setSelectedSubCategory}
        showMissingIntegrationMessage
        onlyAgentlessFilter={onlyAgentlessFilter}
      />
      {openCollectionCard && (
        <CollectionFlyout
          title={openCollectionCard.title}
          description={openCollectionCard.description}
          variants={collectionVariants}
          onClose={closeCollection}
        />
      )}
    </>
  );
};
