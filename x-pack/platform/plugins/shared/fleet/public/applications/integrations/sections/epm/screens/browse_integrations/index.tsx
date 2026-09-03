/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { useLocation, useHistory } from 'react-router-dom';

import { OBLT_DEFAULT_CATEGORIES } from '../../../../../../../common/constants';
import { CardIcon } from '../../../../../../components/package_icon';
import type { CollectionVariant } from '../home/card_utils';
import { COLLECTION_QUERYPARAM } from '../home/card_utils';
import { CollectionFlyout } from '../home/components/collection_flyout';

import { useBreadcrumbs, useStartServices } from '../../../../hooks';
import { NoEprCallout } from '../../components/no_epr_callout';
import { categoryExists } from '../home';

import { ResponsivePackageGrid } from './components/responsive_package_grid';
import { SearchAndFiltersBar } from './components/search_and_filters_bar';
import { Sidebar } from './components/side_bar';
import { useBrowseIntegrationHook } from './hooks';
import {
  useSetUrlCategory,
  useUrlDefaultCategories,
  useSetUrlDefaultCategories,
} from './hooks/url_categories';
import { NoDataPrompt } from './components/no_data_prompt';
import {
  ManageIntegrationsTable,
  type CreatedIntegrationRow,
} from './components/manage_integrations_table';

export const BrowseIntegrationsPage: React.FC<{ prereleaseIntegrationsEnabled: boolean }> = ({
  prereleaseIntegrationsEnabled,
}) => {
  useBreadcrumbs('integrations_all');

  const { automaticImport, application, cloud } = useStartServices();
  const { pathname, search } = useLocation();
  const history = useHistory();

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
  const euiTheme = useEuiTheme();

  const automaticImportCapabilities = (
    application.capabilities as Record<string, { view?: boolean } | undefined>
  ).automatic_import;
  const canReadAutomaticImportIntegrations =
    automaticImportCapabilities?.view ?? Boolean(automaticImport);

  const useGetAllIntegrationsHook = canReadAutomaticImportIntegrations
    ? automaticImport?.hooks.useGetAllIntegrations ?? useEmptyAllIntegrations
    : useEmptyAllIntegrations;
  const {
    integrations,
    isInitialLoading: isLoadingCreatedIntegrations,
    isError: isCreatedIntegrationsError,
    refetch: refetchCreatedIntegrations,
  } = useGetAllIntegrationsHook();
  const hasCreatedIntegrations = integrations.length > 0;
  const isManageIntegrationsView = useMemo(() => {
    const params = new URLSearchParams(search);
    return canReadAutomaticImportIntegrations && params.get('view') === 'manage';
  }, [canReadAutomaticImportIntegrations, search]);

  const manageIntegrationsHref = useMemo(() => {
    const params = new URLSearchParams(search);
    params.set('view', 'manage');
    return `${pathname}?${params.toString()}`;
  }, [pathname, search]);
  const onManageIntegrationsClick = useCallback(
    (ev: React.MouseEvent<HTMLAnchorElement>) => {
      ev.preventDefault();
      history.push(manageIntegrationsHref);
    },
    [history, manageIntegrationsHref]
  );

  const setUrlCategory = useSetUrlCategory();
  const setUrlDefaultCategories = useSetUrlDefaultCategories();
  const urlDefaultCategories = useUrlDefaultCategories();
  const {
    allCategories,
    initialSelectedCategory,
    selectedCategories,
    mainCategories,
    isLoading,
    isLoadingCategories,
    isLoadingAllPackages,
    isLoadingAppendCustomIntegrations,
    eprPackageLoadingError,
    eprCategoryLoadingError,
    filteredCards: rawFilteredCards,
    allCards,
    onCategoryChange,
    availableSubCategories,
  } = useBrowseIntegrationHook({ prereleaseIntegrationsEnabled });

  // Override onCardClick for collection tiles so they open the flyout instead of navigating away.
  const filteredCards = useMemo(
    () =>
      rawFilteredCards.map((card) => {
        if (!card.isCollectionCard) return card;
        return { ...card, onCardClick: () => openCollection(card.name) };
      }),
    [rawFilteredCards, openCollection]
  );

  // Resolve the open collection card from allCards so it survives category/search filters.
  const openCollectionCard = useMemo(
    () =>
      openCollectionGroupId
        ? allCards.find((c) => c.isCollectionCard && c.name === openCollectionGroupId)
        : undefined,
    [openCollectionGroupId, allCards]
  );

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

  // Tracks whether we've already auto-redirected to the default categories this page visit.
  // Without this, clicking "All categories" (which clears URL categories) would immediately
  // trigger another redirect back to the defaults — preventing the user from removing them.
  const hasAutoRedirectedRef = useRef(false);

  const isObservability = cloud?.serverless?.projectType === 'observability';

  useEffect(() => {
    if (
      hasAutoRedirectedRef.current ||
      !isObservability ||
      isLoading ||
      isManageIntegrationsView ||
      initialSelectedCategory ||
      urlDefaultCategories.length > 0
    )
      return;
    // Mark as redirected regardless of whether valid defaults exist, so the
    // effect does not keep re-running when none of the default categories exist
    // in the catalog.
    hasAutoRedirectedRef.current = true;
    const validDefaults = OBLT_DEFAULT_CATEGORIES.filter((cat) =>
      categoryExists(cat, allCategories)
    );
    if (validDefaults.length > 0) {
      setUrlDefaultCategories(validDefaults, { replace: true });
    }
  }, [
    isObservability,
    isLoading,
    isManageIntegrationsView,
    initialSelectedCategory,
    urlDefaultCategories.length,
    allCategories,
    setUrlDefaultCategories,
  ]);

  if (!isLoading && !categoryExists(initialSelectedCategory, allCategories)) {
    setUrlCategory({ category: '' }, { replace: true });
    return null;
  }

  let noEprCallout;
  if (eprPackageLoadingError || eprCategoryLoadingError) {
    const error = eprPackageLoadingError || eprCategoryLoadingError;
    noEprCallout = (
      <EuiFlexItem grow={1}>
        <NoEprCallout statusCode={error?.statusCode} />
        <EuiSpacer size="s" />
      </EuiFlexItem>
    );
  }

  return (
    <>
      {openCollectionCard && (
        <CollectionFlyout
          title={openCollectionCard.title}
          description={openCollectionCard.description}
          variants={collectionVariants}
          onClose={closeCollection}
        />
      )}
      <EuiFlexGroup
        justifyContent="flexEnd"
        alignItems="flexStart"
        gutterSize="none"
        data-test-subj="epmList.integrationCards"
      >
        <Sidebar
          isLoading={isLoading}
          categories={mainCategories}
          selectedCategories={selectedCategories}
          onCategoryChange={onCategoryChange}
          CreateIntegrationCardButton={
            canReadAutomaticImportIntegrations
              ? automaticImport?.components.CreateIntegrationSideCardButton
              : undefined
          }
          hasCreatedIntegrations={hasCreatedIntegrations}
          createdIntegrationsCount={integrations.length}
          isLoadingCreatedIntegrations={isLoadingCreatedIntegrations}
          manageIntegrationsHref={manageIntegrationsHref}
          onManageIntegrationsClick={onManageIntegrationsClick}
        />
        <EuiFlexItem grow={5}>
          <EuiFlexGroup direction="column" gutterSize="none">
            {!isManageIntegrationsView && (
              <SearchAndFiltersBar
                categories={mainCategories}
                availableSubCategories={availableSubCategories}
              />
            )}
            {noEprCallout ? noEprCallout : null}
            <EuiFlexItem
              grow={1}
              data-test-subj="epmList.mainColumn"
              style={{
                position: 'relative',
                backgroundColor: euiTheme.euiTheme.colors.backgroundBasePlain,
              }}
            >
              {isManageIntegrationsView ? (
                <>
                  <EuiSpacer size="m" />
                  <ManageIntegrationsTable
                    integrations={integrations}
                    isLoading={isLoadingCreatedIntegrations}
                    isError={isCreatedIntegrationsError}
                    onRefetch={refetchCreatedIntegrations}
                    prereleaseIntegrationsEnabled={prereleaseIntegrationsEnabled}
                  />
                </>
              ) : filteredCards.length === 0 && !isLoading ? (
                <NoDataPrompt />
              ) : (
                <ResponsivePackageGrid
                  items={filteredCards}
                  isLoading={
                    isLoadingCategories || isLoadingAllPackages || isLoadingAppendCustomIntegrations
                  }
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

function useEmptyAllIntegrations() {
  return {
    integrations: [] as CreatedIntegrationRow[],
    isInitialLoading: false,
    isError: false,
    error: null,
    refetch: () => {},
  };
}
