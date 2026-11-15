/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode, FunctionComponent } from 'react';
import { useMemo } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useLocalSearch, searchIdField, useStartServices } from '../../../../hooks';
import { INTEGRATIONS_BASE_PATH, INTEGRATIONS_PLUGIN_ID } from '../../../../constants';
import type { CreatePackagePolicyRouteState } from '../../../../types';

import type { IntegrationCardItem } from '../../screens/home';
import { withSearchMemberMatch } from '../../screens/home/search_member_match';
import { buildCollectionVariants } from '../../screens/home/collection_variants';
import { CollectionFlyout } from '../../screens/home/components/collection_flyout';

import type {
  ExtendedIntegrationCategory,
  CategoryFacet,
} from '../../screens/home/category_facets';

import type { IntegrationsURLParameters } from '../../screens/home/hooks/use_available_packages';

import { promoteFeaturedIntegrations } from '../utils';

import { ControlsColumn } from './controls';
import { GridColumn } from './grid';
import { MissingIntegrationContent } from './missing_integrations';
import { SearchBox } from './search_box';

const StickySidebar = styled(EuiFlexItem)`
  @media (min-width: ${(props) => props.theme.eui.euiBreakpoints.m}) {
    position: sticky;
    top: calc(
      var(--kbn-application--sticky-headers-offset, 96px) +
        ${(props) => props.theme.eui.euiSizeL /* 24px */}
    );
  }
`;

export interface PackageListGridProps {
  isLoading?: boolean;
  controls?: ReactNode | ReactNode[];
  emptyStateStyles?: Record<string, string>;
  list: IntegrationCardItem[];
  searchTerm: string;
  setSearchTerm: (search: string) => void;
  selectedCategory: ExtendedIntegrationCategory;
  setCategory: (category: ExtendedIntegrationCategory) => void;
  categories: CategoryFacet[];
  setUrlandReplaceHistory: (params: IntegrationsURLParameters) => void;
  setUrlandPushHistory: (params: IntegrationsURLParameters) => void;
  callout?: JSX.Element | null;
  // Props to decide the size of the spacer above callout. Security Solution uses this prop to customize the size of the spacer
  calloutTopSpacerSize?: 's' | 'm' | 'xs' | 'l' | 'xl' | 'xxl';
  // Props used only in AvailablePackages component:
  showCardLabels?: boolean;
  title?: string;
  availableSubCategories?: CategoryFacet[];
  selectedSubCategory?: string;
  setSelectedSubCategory?: (c: string | undefined) => void;
  showMissingIntegrationMessage?: boolean;
  showControls?: boolean;
  showSearchTools?: boolean;
  // Customizing whether to sort by the default featured integrations' categories. Security Solution has custom sorting logic
  sortByFeaturedIntegrations?: boolean;
  spacer?: boolean;
  // Security Solution sends the id to determine which element to scroll when the user interacting with the package list
  scrollElementId?: string;
  onlyAgentlessFilter?: boolean;
  backgroundColor?: 'plain' | 'transparent';
  /**
   * Opt-in for hosts outside the Integrations app (e.g. Security onboarding). When set, clicking a
   * collection card opens the variant chooser flyout inside the grid instead of calling the card's
   * own `onCardClick`. Variant links carry these as `returnAppId`/`returnPath` so the package
   * detail and add-integration pages navigate back to the host. Leave unset when the host manages
   * the chooser itself (Fleet's own pages use the `?collection=` URL param).
   */
  collectionReturnLocation?: { appId: string; path: string };
  /** Called when a collection card is clicked, e.g. for telemetry. Only used with `collectionReturnLocation`. */
  onCollectionClick?: (card: IntegrationCardItem) => void;
  /** Called when a variant is picked in the chooser. Only used with `collectionReturnLocation`. */
  onCollectionVariantClick?: (member: IntegrationCardItem) => void;
}

export const PackageListGrid: FunctionComponent<PackageListGridProps> = ({
  isLoading,
  controls,
  emptyStateStyles,
  title,
  list,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setCategory,
  categories,
  availableSubCategories,
  setSelectedSubCategory,
  selectedSubCategory,
  setUrlandReplaceHistory,
  setUrlandPushHistory,
  showMissingIntegrationMessage = false,
  onlyAgentlessFilter = false,
  sortByFeaturedIntegrations = true,
  callout,
  calloutTopSpacerSize = 'l', // Default EUI spacer size
  showCardLabels = true,
  showControls = true,
  showSearchTools = true,
  spacer = true,
  scrollElementId,
  backgroundColor,
  collectionReturnLocation,
  onCollectionClick,
  onCollectionVariantClick,
}) => {
  const euiTheme = useEuiTheme();
  const { application, http } = useStartServices();
  const localSearch = useLocalSearch(list, !!isLoading);

  const [isPopoverOpen, setPopover] = useState(false);

  const MAX_SUBCATEGORIES_NUMBER = 6;

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const resetQuery = () => {
    setSearchTerm('');
    setUrlandReplaceHistory({
      searchString: '',
      categoryId: '',
      subCategoryId: '',
      onlyAgentless: onlyAgentlessFilter,
    });
  };

  const onSubCategoryClick = useCallback(
    (subCategory: string) => {
      if (setSelectedSubCategory) setSelectedSubCategory(subCategory);
      setUrlandPushHistory({
        categoryId: selectedCategory,
        subCategoryId: subCategory,
        onlyAgentless: onlyAgentlessFilter,
      });
    },
    [selectedCategory, setSelectedSubCategory, setUrlandPushHistory, onlyAgentlessFilter]
  );

  const filteredPromotedList: IntegrationCardItem[] = useMemo(() => {
    if (isLoading) return [];

    const searchResults =
      (localSearch?.search(searchTerm) as IntegrationCardItem[]).map(
        (match) => match[searchIdField]
      ) ?? [];

    const filteredList = searchTerm
      ? list.filter((item) => searchResults.includes(item[searchIdField]) ?? [])
      : list;

    const withMemberMatch = searchTerm
      ? filteredList.map((item) => withSearchMemberMatch(item, searchTerm))
      : filteredList;

    return sortByFeaturedIntegrations
      ? promoteFeaturedIntegrations(withMemberMatch, selectedCategory)
      : withMemberMatch;
  }, [isLoading, list, localSearch, searchTerm, selectedCategory, sortByFeaturedIntegrations]);

  const [openCollectionId, setOpenCollectionId] = useState<string | undefined>();

  // With `collectionReturnLocation`, the grid owns the collection chooser: replace the host's
  // click handler on collection cards (it would otherwise navigate to the card's fallback url).
  const gridList: IntegrationCardItem[] = useMemo(() => {
    if (!collectionReturnLocation) return filteredPromotedList;
    return filteredPromotedList.map((card) =>
      card.isCollectionCard
        ? {
            ...card,
            onCardClick: () => {
              onCollectionClick?.(card);
              setOpenCollectionId(card.name);
            },
          }
        : card
    );
  }, [collectionReturnLocation, filteredPromotedList, onCollectionClick]);

  const openCollectionCard = useMemo(
    () =>
      openCollectionId
        ? filteredPromotedList.find((c) => c.isCollectionCard && c.name === openCollectionId)
        : undefined,
    [openCollectionId, filteredPromotedList]
  );

  // Close the chooser when filters or search remove (or degrade) the open collection.
  // Only once loaded: the list is empty while packages load.
  useEffect(() => {
    if (!isLoading && openCollectionId && !openCollectionCard) setOpenCollectionId(undefined);
  }, [isLoading, openCollectionId, openCollectionCard]);

  const collectionVariants = useMemo(
    () =>
      openCollectionCard && collectionReturnLocation
        ? buildCollectionVariants(
            openCollectionCard,
            {
              returnAppId: collectionReturnLocation.appId,
              returnPath: collectionReturnLocation.path,
            },
            (href, member) => {
              onCollectionVariantClick?.(member);
              setOpenCollectionId(undefined);

              // Like `PackageCard`, navigate within the integrations app and hand the host's
              // cancel/save targets over as route state: the add-integration page reads the save
              // target only from state, not from the `returnAppId`/`returnPath` query params.
              const integrationsBase = http.basePath.prepend(INTEGRATIONS_BASE_PATH);
              if (!href.startsWith(integrationsBase)) {
                application.navigateToUrl(href);
                return;
              }
              const hostTarget: [string, { path: string }] = [
                collectionReturnLocation.appId,
                { path: collectionReturnLocation.path },
              ];
              const state: CreatePackagePolicyRouteState = {
                onCancelNavigateTo: hostTarget,
                onCancelUrl: application.getUrlForApp(...hostTarget),
                onSaveNavigateTo: hostTarget,
              };
              application.navigateToApp(INTEGRATIONS_PLUGIN_ID, {
                path: href.slice(integrationsBase.length),
                state,
              });
            }
          )
        : [],
    [openCollectionCard, collectionReturnLocation, onCollectionVariantClick, application, http]
  );

  const splitSubcategories = (
    subcategories: CategoryFacet[] | undefined
  ): { visibleSubCategories?: CategoryFacet[]; hiddenSubCategories?: CategoryFacet[] } => {
    if (!subcategories) return {};
    else if (subcategories && subcategories?.length < MAX_SUBCATEGORIES_NUMBER) {
      return { visibleSubCategories: subcategories, hiddenSubCategories: [] };
    } else if (subcategories && subcategories?.length >= MAX_SUBCATEGORIES_NUMBER) {
      return {
        visibleSubCategories: subcategories.slice(0, MAX_SUBCATEGORIES_NUMBER),
        hiddenSubCategories: subcategories.slice(MAX_SUBCATEGORIES_NUMBER),
      };
    }
    return {};
  };

  const splitSubcat = splitSubcategories(availableSubCategories);
  const { visibleSubCategories } = splitSubcat;
  const hiddenSubCategoriesItems = useMemo(() => {
    return splitSubcat?.hiddenSubCategories?.map((subCategory) => {
      return (
        <EuiContextMenuItem
          key={subCategory.id}
          onClick={() => {
            onSubCategoryClick(subCategory.id);
            closePopover();
          }}
          icon={selectedSubCategory === subCategory.id ? 'check' : 'empty'}
        >
          {subCategory.title}
        </EuiContextMenuItem>
      );
    });
  }, [onSubCategoryClick, selectedSubCategory, splitSubcat?.hiddenSubCategories]);

  return (
    <EuiFlexGroup
      justifyContent="flexEnd"
      alignItems="flexStart"
      gutterSize="xl"
      data-test-subj="epmList.integrationCards"
    >
      {showControls && (
        <StickySidebar data-test-subj="epmList.controlsSideColumn" grow={1}>
          <ControlsColumn controls={controls} title={title} />
        </StickySidebar>
      )}

      <EuiFlexItem
        grow={5}
        data-test-subj="epmList.mainColumn"
        style={{
          position: 'relative',
          backgroundColor:
            backgroundColor === 'transparent'
              ? 'transparent'
              : euiTheme.euiTheme.colors.backgroundBasePlain,
          alignSelf: 'stretch',
        }}
      >
        {showSearchTools && (
          <EuiFlexItem grow={false}>
            <SearchBox
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedCategory={selectedCategory}
              setCategory={setCategory}
              categories={categories}
              availableSubCategories={availableSubCategories}
              setSelectedSubCategory={setSelectedSubCategory}
              selectedSubCategory={selectedSubCategory}
              setUrlandReplaceHistory={setUrlandReplaceHistory}
              onlyAgentlessFilter={onlyAgentlessFilter}
            />
          </EuiFlexItem>
        )}

        {availableSubCategories?.length ? <EuiSpacer size="m" /> : null}

        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            data-test-subj="epmList.subcategoriesRow"
            justifyContent="flexStart"
            direction="row"
            gutterSize="s"
            style={{
              maxWidth: '100%',
              flexWrap: 'wrap',
            }}
          >
            {visibleSubCategories?.map((subCategory) => {
              const isSelected = subCategory.id === selectedSubCategory;
              return (
                <EuiFlexItem grow={false} key={subCategory.id}>
                  <EuiButton
                    css={isSelected ? 'color: white' : ''}
                    color={isSelected ? 'accent' : 'text'}
                    fill={isSelected}
                    aria-label={subCategory?.title}
                    onClick={() => onSubCategoryClick(subCategory.id)}
                    size="s"
                  >
                    <FormattedMessage
                      id="xpack.fleet.epmList.subcategoriesButton"
                      defaultMessage="{subcategory}"
                      values={{
                        subcategory: subCategory.title,
                      }}
                    />
                  </EuiButton>
                </EuiFlexItem>
              );
            })}
            {hiddenSubCategoriesItems?.length ? (
              <EuiFlexItem grow={false}>
                <EuiPopover
                  aria-label={i18n.translate('xpack.fleet.epmList.subcategoriesPopoverAriaLabel', {
                    defaultMessage: 'More subcategories',
                  })}
                  data-test-subj="epmList.showMoreSubCategoriesButton"
                  id="moreSubCategories"
                  button={
                    <EuiToolTip content="Show more subcategories" disableScreenReaderOutput>
                      <EuiButtonIcon
                        display="base"
                        onClick={onButtonClick}
                        iconType="ellipsis"
                        aria-label="Show more subcategories"
                        size="s"
                      />
                    </EuiToolTip>
                  }
                  isOpen={isPopoverOpen}
                  closePopover={closePopover}
                  panelPaddingSize="none"
                  anchorPosition="downLeft"
                >
                  <EuiContextMenuPanel items={hiddenSubCategoriesItems} />
                </EuiPopover>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
        {callout ? (
          <>
            <EuiSpacer size={calloutTopSpacerSize} />
            {callout}
          </>
        ) : null}
        {spacer && <EuiSpacer size="m" />}
        <EuiFlexItem>
          <GridColumn
            emptyStateStyles={emptyStateStyles}
            isLoading={!!isLoading}
            list={gridList}
            showMissingIntegrationMessage={showMissingIntegrationMessage}
            showCardLabels={showCardLabels}
            scrollElementId={scrollElementId}
          />
        </EuiFlexItem>
        {showMissingIntegrationMessage && (
          <>
            <EuiSpacer />
            <MissingIntegrationContent
              setUrlandPushHistory={setUrlandPushHistory}
              resetQuery={resetQuery}
              setSelectedCategory={setCategory}
            />
            <EuiSpacer />
          </>
        )}
      </EuiFlexItem>
      {openCollectionCard && collectionReturnLocation && (
        <CollectionFlyout
          title={openCollectionCard.title}
          description={openCollectionCard.description}
          variants={collectionVariants}
          onClose={() => setOpenCollectionId(undefined)}
        />
      )}
    </EuiFlexGroup>
  );
};
