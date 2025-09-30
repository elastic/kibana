/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiEmptyPrompt,
  EuiButton,
  useEuiTheme,
} from '@elastic/eui';

import type { ComponentTemplateListItem } from '../../../../../common';
import { FilterListButton } from './components';
import { ComponentTemplatesList } from './component_templates_list';
import type { Props as ComponentTemplatesListItemProps } from './component_templates_list_item';

interface Props {
  isLoading: boolean;
  components: ComponentTemplateListItem[];
  listItemProps: Omit<ComponentTemplatesListItemProps, 'component'>;
}

interface Filters {
  [key: string]: { name: string; checked: 'on' | 'off' };
}

const useStyles = ({ isSearchResultEmpty }: { isSearchResultEmpty: boolean }) => {
  const { euiTheme } = useEuiTheme();
  const heightHeader = `calc(${euiTheme.size.l} * 2)`;

  return {
    container: css`
      border: ${euiTheme.border.thin};
      border-radius: ${euiTheme.border.radius.medium};
      border-top: none;
      height: 100%;
    `,
    header: css`
      height: ${heightHeader};

      .euiFormControlLayout {
        max-width: initial;
      }
    `,
    searchBox: css`
      border-bottom: ${euiTheme.border.thin};
      border-top: ${euiTheme.border.thin};
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
      box-shadow: none;
      max-width: initial;
    `,
    filterListButton: css`
      box-shadow: none;
      height: ${euiTheme.size.xxl}; /* Align the height with the search input height */

      &,
      & > :first-child .euiFilterButton {
        /* EUI specificity override */
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
      }

      &::after {
        border: ${euiTheme.border.thin};
      }
    `,
    listWrapper: css`
      height: calc(100% - ${heightHeader});

      ${isSearchResultEmpty &&
      css`
        display: flex; /* Will center vertically the empty search result */
      `}
    `,
  };
};

/**
 * Copied from https://stackoverflow.com/a/9310752
 */
function escapeRegExp(text: string) {
  return text.replace(/[-\[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function fuzzyMatch(searchValue: string, text: string) {
  const pattern = `.*${searchValue.split('').map(escapeRegExp).join('.*')}.*`;
  const regex = new RegExp(pattern);
  return regex.test(text);
}

const i18nTexts = {
  filters: {
    settings: i18n.translate(
      'xpack.idxMgmt.componentTemplatesSelector.filters.indexSettingsLabel',
      { defaultMessage: 'Index settings' }
    ),
    mappings: i18n.translate('xpack.idxMgmt.componentTemplatesSelector.filters.mappingsLabel', {
      defaultMessage: 'Mappings',
    }),
    aliases: i18n.translate('xpack.idxMgmt.componentTemplatesSelector.filters.aliasesLabel', {
      defaultMessage: 'Aliases',
    }),
  },
  searchBoxPlaceholder: i18n.translate(
    'xpack.idxMgmt.componentTemplatesSelector.searchBox.placeholder',
    {
      defaultMessage: 'Search component templates',
    }
  ),
};

const getInitialFilters = (): Filters => ({
  settings: {
    name: i18nTexts.filters.settings,
    checked: 'off',
  },
  mappings: {
    name: i18nTexts.filters.mappings,
    checked: 'off',
  },
  aliases: {
    name: i18nTexts.filters.aliases,
    checked: 'off',
  },
});

export const ComponentTemplates = ({ isLoading, components, listItemProps }: Props) => {
  const [searchValue, setSearchValue] = useState('');

  const [filters, setFilters] = useState(getInitialFilters);

  const filteredComponents = useMemo<ComponentTemplateListItem[]>(() => {
    if (isLoading) {
      return [];
    }

    return components
      .filter((component) => {
        if (filters.settings.checked === 'on' && !component.hasSettings) {
          return false;
        }
        if (filters.mappings.checked === 'on' && !component.hasMappings) {
          return false;
        }
        if (filters.aliases.checked === 'on' && !component.hasAliases) {
          return false;
        }

        if (searchValue.trim() === '') {
          return true;
        }

        const match = fuzzyMatch(searchValue, component.name);
        return match;
      })
      .sort((a, b) => {
        if (a.name < b.name) {
          return -1;
        } else if (a.name > b.name) {
          return 1;
        }
        return 0;
      });
  }, [isLoading, components, searchValue, filters]);

  const isSearchResultEmpty = filteredComponents.length === 0 && components.length > 0;
  const styles = useStyles({ isSearchResultEmpty });

  if (isLoading) {
    return null;
  }

  const clearSearch = () => {
    setSearchValue('');
    setFilters(getInitialFilters());
  };

  const renderEmptyResult = () => {
    return (
      <EuiEmptyPrompt
        iconType="search"
        title={
          <h3>
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplatesSelector.searchResult.emptyPromptTitle"
              defaultMessage="No components match your search"
            />
          </h3>
        }
        actions={
          <EuiButton onClick={clearSearch}>
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplatesSelector.searchResult.emptyPrompt.clearSearchButtonLabel"
              defaultMessage="Clear search"
            />
          </EuiButton>
        }
        data-test-subj="emptySearchResult"
      />
    );
  };

  return (
    <div css={styles.container} data-test-subj="componentTemplates">
      <div css={styles.header}>
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem>
            <EuiFieldSearch
              placeholder={i18nTexts.searchBoxPlaceholder}
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
              }}
              aria-label={i18nTexts.searchBoxPlaceholder}
              css={styles.searchBox}
              data-test-subj="componentTemplateSearchBox"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FilterListButton filters={filters} onChange={setFilters} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <div css={[styles.listWrapper]} className="eui-yScrollWithShadows">
        {isSearchResultEmpty ? (
          renderEmptyResult()
        ) : (
          <ComponentTemplatesList components={filteredComponents} listItemProps={listItemProps} />
        )}
      </div>
    </div>
  );
};
