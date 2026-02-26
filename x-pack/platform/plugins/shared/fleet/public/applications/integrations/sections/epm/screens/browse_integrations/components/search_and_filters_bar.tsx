/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';

import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormPrepend,
  EuiIcon,
  EuiPopover,
  EuiScreenReaderOnly,
  EuiSelectable,
  EuiSpacer,
  mathWithUnits,
  useEuiTheme,
} from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import useDebounce from 'react-use/lib/useDebounce';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

import type { CategoryFacet } from '../../home/category_facets';

import { useUrlFilters, useAddUrlFilters } from '../hooks/url_filters';
import type { BrowseIntegrationSortType, IntegrationStatusFilterType } from '../types';
import { StatusFilter } from '../../../components/status_filter';

const SEARCH_DEBOUNCE_MS = 150;

export const StickyFlexItem = styled(EuiFlexItem)`
  position: sticky;
  background-color: ${(props) => props.theme.euiTheme.colors.backgroundBasePlain};
  z-index: ${(props) => props.theme.euiTheme.levels.menu};
  top: var(--kbn-application--sticky-headers-offset, var(--kbn-layout--header-height, '0px'));
  padding-top: ${(props) => props.theme.euiTheme.size.m};
`;

const SortFilter: React.FC = () => {
  const urlFilters = useUrlFilters();
  const addUrlFilters = useAddUrlFilters();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const togglePopover = useCallback(() => setIsOpen((prevIsOpen) => !prevIsOpen), []);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const options = useMemo(
    () => [
      // TODO enabled when supported
      // {
      //   label: i18n.translate(
      //     'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.sortByRecentOldOption',
      //     {
      //       defaultMessage: 'Recent-Old',
      //     }
      //   ),
      //   key: 'recent-old',
      // },
      // {
      //   label: i18n.translate(
      //     'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.sortByOldRecentOption',
      //     {
      //       defaultMessage: 'Old-Recent',
      //     }
      //   ),
      //   key: 'old-recent',
      // },
      {
        label: i18n.translate(
          'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.sortByAZOption',
          {
            defaultMessage: 'A-Z',
          }
        ),
        key: 'a-z',
        'data-test-subj': 'browseIntegrations.searchBar.sortByAZOption',
      },
      {
        label: i18n.translate(
          'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.sortByZAOption',
          {
            defaultMessage: 'Z-A',
          }
        ),
        key: 'z-a',
        'data-test-subj': 'browseIntegrations.searchBar.sortByZAOption',
      },
    ],
    []
  );

  const selectedOption = useMemo(() => {
    if (!urlFilters.sort) {
      return options[0];
    }

    return options.find((option) => option.key === urlFilters.sort) ?? options[0];
  }, [urlFilters.sort, options]);

  return (
    <EuiFilterGroup compressed>
      <EuiPopover
        id="browseIntegrationsSortPopover"
        isOpen={isOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        button={
          <EuiFilterButton
            data-test-subj="browseIntegrations.searchBar.sortBtn"
            iconType="arrowDown"
            onClick={togglePopover}
            isSelected={isOpen}
          >
            {selectedOption.label}
          </EuiFilterButton>
        }
      >
        <EuiSelectable
          searchable={false}
          singleSelection={true}
          options={options}
          onChange={(newOptions) => {
            const selected = newOptions.find((option) => option.checked);
            if (selected) {
              addUrlFilters({ sort: selected.key as BrowseIntegrationSortType });
              closePopover();
            }
          }}
          listProps={{
            paddingSize: 's',
            showIcons: false,
          }}
        >
          {(list) => list}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

interface SearchBarProps {
  selectedCategory?: string;
  categories?: CategoryFacet[];
  availableSubCategories?: CategoryFacet[];
  selectedSubCategory?: string;
  onCategoryBadgeDismiss?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  selectedCategory,
  categories,
  availableSubCategories,
  selectedSubCategory,
  onCategoryBadgeDismiss,
}) => {
  const urlFilters = useUrlFilters();
  const addUrlFilters = useAddUrlFilters();
  const styles = useMemoCss(searchBarStyles);

  const [searchTerms, setSearchTerms] = useState(urlFilters.q);

  useDebounce(
    () => {
      addUrlFilters(
        {
          q: searchTerms,
        },
        { replace: true }
      );
    },
    SEARCH_DEBOUNCE_MS,
    [searchTerms]
  );

  const selectedCategoryTitle = selectedCategory
    ? categories?.find((category) => category.id === selectedCategory)?.title
    : undefined;

  const categoryBadgeLabel = useMemo(() => {
    const selectedSubCategoryTitle =
      selectedSubCategory && availableSubCategories
        ? availableSubCategories.find((subCat) => subCat.id === selectedSubCategory)?.title
        : undefined;

    if (selectedCategoryTitle && selectedSubCategoryTitle) {
      return `${selectedCategoryTitle}, ${selectedSubCategoryTitle}`;
    }
    return selectedCategoryTitle ?? '';
  }, [availableSubCategories, selectedCategoryTitle, selectedSubCategory]);

  return (
    <EuiFieldSearch
      compressed
      placeholder={i18n.translate(
        'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.searchPlaceholder',
        {
          defaultMessage: 'Search integrations',
        }
      )}
      value={searchTerms}
      data-test-subj="browseIntegrations.searchBar.input"
      onChange={(e) => setSearchTerms(e.target.value)}
      fullWidth
      prepend={
        selectedCategoryTitle ? (
          <EuiFormPrepend
            label={
              <>
                <EuiScreenReaderOnly>
                  <span>
                    {i18n.translate(
                      'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.categoryBadgeScreenReader',
                      { defaultMessage: 'Searching category: ' }
                    )}
                  </span>
                </EuiScreenReaderOnly>
                {categoryBadgeLabel}
              </>
            }
            data-test-subj="epmList.categoryBadge"
          >
            <button
              css={styles.clearButton}
              onClick={onCategoryBadgeDismiss}
              aria-label={i18n.translate(
                'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.removeCategoryFilter',
                { defaultMessage: 'Remove filter' }
              )}
              data-test-subj="epmList.categoryBadge.closeBtn"
            >
              <EuiIcon type="cross" color="text" size="s" aria-hidden={true} />
            </button>
          </EuiFormPrepend>
        ) : undefined
      }
    />
  );
};

const searchBarStyles = {
  clearButton: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      blockSize: euiTheme.size.m,
      inlineSize: euiTheme.size.m,
      padding: euiTheme.size.s,
      borderRadius: mathWithUnits(euiTheme.border.radius.small, (x) => x / 2),
      backgroundColor: euiTheme.colors.backgroundLightText,
    }),
};

const MAX_VISIBLE_SUBCATEGORIES = 6;

interface SearchAndFiltersBarProps {
  selectedCategory?: string;
  categories?: CategoryFacet[];
  availableSubCategories?: CategoryFacet[];
  selectedSubCategory?: string;
  onSubCategoryClick: (subCategoryId: string) => void;
  onCategoryBadgeDismiss: () => void;
}

export const SearchAndFiltersBar: React.FC<SearchAndFiltersBarProps> = ({
  selectedCategory,
  categories,
  availableSubCategories,
  selectedSubCategory,
  onSubCategoryClick,
  onCategoryBadgeDismiss,
}) => {
  const { euiTheme } = useEuiTheme();
  const urlFilters = useUrlFilters();
  const addUrlFilters = useAddUrlFilters();

  const [isSubCategoryPopoverOpen, setIsSubCategoryPopoverOpen] = useState(false);

  const handleStatusChange = useCallback(
    (statuses: IntegrationStatusFilterType[]) => {
      addUrlFilters({ status: statuses.length > 0 ? statuses : undefined });
    },
    [addUrlFilters]
  );

  const visibleSubCategories = useMemo(
    () => availableSubCategories?.slice(0, MAX_VISIBLE_SUBCATEGORIES),
    [availableSubCategories]
  );

  const hiddenSubCategoriesItems = useMemo(() => {
    return availableSubCategories?.slice(MAX_VISIBLE_SUBCATEGORIES).map((subCategory) => (
      <EuiContextMenuItem
        key={subCategory.id}
        onClick={() => {
          onSubCategoryClick(subCategory.id);
          setIsSubCategoryPopoverOpen(false);
        }}
        icon={selectedSubCategory === subCategory.id ? 'check' : 'empty'}
      >
        {subCategory.title}
      </EuiContextMenuItem>
    ));
  }, [availableSubCategories, onSubCategoryClick, selectedSubCategory]);

  return (
    <StickyFlexItem>
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
        <EuiFlexItem grow={true}>
          <SearchBar
            selectedCategory={selectedCategory}
            categories={categories}
            availableSubCategories={availableSubCategories}
            selectedSubCategory={selectedSubCategory}
            onCategoryBadgeDismiss={onCategoryBadgeDismiss}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup compressed>
            <EuiFilterButton>
              <FormattedMessage
                id="xpack.fleet.epm.browseIntegrations.searchAndFilterBar.setupMethodLabel"
                defaultMessage="Setup method"
              />
            </EuiFilterButton>
            <EuiFilterButton>
              <FormattedMessage
                id="xpack.fleet.epm.browseIntegrations.searchAndFilterBar.allSignalsLabel"
                defaultMessage="All signals"
              />
            </EuiFilterButton>

            <StatusFilter
              selectedStatuses={urlFilters.status}
              onChange={handleStatusChange}
              testSubjPrefix="browseIntegrations.searchBar"
              popoverId="browseIntegrationsStatusPopover"
            />
          </EuiFilterGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <SortFilter />
        </EuiFlexItem>
      </EuiFlexGroup>

      {visibleSubCategories && visibleSubCategories.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup
            data-test-subj="browseIntegrations.subcategoriesRow"
            justifyContent="flexStart"
            direction="row"
            gutterSize="s"
            wrap
          >
            {visibleSubCategories.map((subCategory) => {
              const isSelected = subCategory.id === selectedSubCategory;
              return (
                <EuiFlexItem grow={false} key={subCategory.id}>
                  <EuiButton
                    css={
                      isSelected
                        ? css`
                            color: ${euiTheme.colors.textInverse};
                          `
                        : undefined
                    }
                    color={isSelected ? 'accent' : 'text'}
                    fill={isSelected}
                    aria-label={subCategory.title}
                    onClick={() => onSubCategoryClick(subCategory.id)}
                    size="s"
                  >
                    {subCategory.title}
                  </EuiButton>
                </EuiFlexItem>
              );
            })}
            {hiddenSubCategoriesItems && hiddenSubCategoriesItems.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiPopover
                  data-test-subj="browseIntegrations.showMoreSubCategoriesButton"
                  id="browseIntegrationsMoreSubCategories"
                  button={
                    <EuiButtonIcon
                      display="base"
                      onClick={() => setIsSubCategoryPopoverOpen((prev) => !prev)}
                      iconType="boxesHorizontal"
                      aria-label={i18n.translate(
                        'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.showMoreSubCategories',
                        { defaultMessage: 'Show more subcategories' }
                      )}
                      size="s"
                    />
                  }
                  isOpen={isSubCategoryPopoverOpen}
                  closePopover={() => setIsSubCategoryPopoverOpen(false)}
                  panelPaddingSize="none"
                  anchorPosition="downLeft"
                >
                  <EuiContextMenuPanel size="s" items={hiddenSubCategoriesItems} />
                </EuiPopover>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      )}

      <EuiSpacer size="m" />
    </StickyFlexItem>
  );
};
