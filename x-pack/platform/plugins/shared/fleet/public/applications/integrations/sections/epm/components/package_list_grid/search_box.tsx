/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';

import {
  EuiFieldSearch,
  EuiIcon,
  EuiScreenReaderOnly,
  EuiFormPrepend,
  type UseEuiTheme,
  mathWithUnits,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

import type {
  ExtendedIntegrationCategory,
  CategoryFacet,
} from '../../screens/home/category_facets';

import type { IntegrationsURLParameters } from '../../screens/home/hooks/use_available_packages';

export interface Props {
  searchTerm: string;
  setSearchTerm: (search: string) => void;
  selectedCategory: ExtendedIntegrationCategory;
  setCategory: (category: ExtendedIntegrationCategory) => void;
  categories: CategoryFacet[];
  availableSubCategories?: CategoryFacet[];
  setUrlandReplaceHistory: (params: IntegrationsURLParameters) => void;
  selectedSubCategory?: string;
  setSelectedSubCategory?: (c: string | undefined) => void;
  onlyAgentlessFilter?: boolean;
}

export const SearchBox: FunctionComponent<Props> = ({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setCategory,
  categories,
  availableSubCategories,
  setSelectedSubCategory,
  selectedSubCategory,
  setUrlandReplaceHistory,
  onlyAgentlessFilter = false,
}) => {
  const styles = useMemoCss(searchBoxStyles);

  const onQueryChange = (e: any) => {
    const queryText = e.target.value;
    setSearchTerm(queryText);
    setUrlandReplaceHistory({
      searchString: queryText,
      categoryId: selectedCategory,
      subCategoryId: selectedSubCategory,
      onlyAgentless: onlyAgentlessFilter,
    });
  };

  const onCategoryButtonClick = () => {
    if (selectedSubCategory) {
      if (setSelectedSubCategory) setSelectedSubCategory(undefined);
      setUrlandReplaceHistory({
        categoryId: selectedCategory,
        subCategoryId: '',
        onlyAgentless: onlyAgentlessFilter,
      });
    } else {
      setCategory('');
      if (setSelectedSubCategory) setSelectedSubCategory(undefined);
      setUrlandReplaceHistory({
        searchString: '',
        categoryId: '',
        subCategoryId: '',
        onlyAgentless: onlyAgentlessFilter,
      });
    }
  };

  const selectedCategoryTitle = selectedCategory
    ? categories.find((category) => category.id === selectedCategory)?.title
    : undefined;

  const getCategoriesLabel = useMemo(() => {
    const selectedSubCategoryTitle =
      selectedSubCategory && availableSubCategories
        ? availableSubCategories.find((subCat) => subCat.id === selectedSubCategory)?.title
        : undefined;

    if (selectedCategoryTitle && selectedSubCategoryTitle) {
      return `${selectedCategoryTitle}, ${selectedSubCategoryTitle}`;
    } else if (selectedCategoryTitle) {
      return `${selectedCategoryTitle}`;
    } else return '';
  }, [availableSubCategories, selectedCategoryTitle, selectedSubCategory]);

  return (
    <EuiFieldSearch
      data-test-subj="epmList.searchBar"
      placeholder={i18n.translate('xpack.fleet.epmList.searchPackagesPlaceholder', {
        defaultMessage: 'Search for integrations',
      })}
      value={searchTerm}
      onChange={(e) => onQueryChange(e)}
      isClearable={true}
      incremental={true}
      fullWidth
      prepend={
        selectedCategoryTitle ? (
          <EuiFormPrepend
            label={
              <>
                <EuiScreenReaderOnly>
                  <span>Searching category: </span>
                </EuiScreenReaderOnly>
                {getCategoriesLabel}
              </>
            }
            data-test-subj="epmList.categoryBadge"
          >
            <button
              css={styles.clearButton}
              onClick={onCategoryButtonClick}
              aria-label="Remove filter"
              data-test-subj="epmList.categoryBadge.closeBtn"
            >
              <EuiIcon type="cross" color="text" size="s" />
            </button>
          </EuiFormPrepend>
        ) : undefined
      }
    />
  );
};

const searchBoxStyles = {
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
