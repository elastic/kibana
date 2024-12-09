/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import classNames from 'classnames';
import React, { useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiFieldSearch, EuiEmptyPrompt, EuiButton } from '@elastic/eui';

import { ComponentTemplateListItem } from '../../../../../common';
import { FilterListButton } from './components';
import { ComponentTemplatesList } from './component_templates_list';
import { Props as ComponentTemplatesListItemProps } from './component_templates_list_item';

import './component_templates.scss';

interface Props {
  isLoading: boolean;
  components: ComponentTemplateListItem[];
  listItemProps: Omit<ComponentTemplatesListItemProps, 'component'>;
}

interface Filters {
  [key: string]: { name: string; checked: 'on' | 'off' };
}

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
    <div className="componentTemplates" data-test-subj="componentTemplates">
      <div className="componentTemplates__header">
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem>
            <EuiFieldSearch
              placeholder={i18nTexts.searchBoxPlaceholder}
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
              }}
              aria-label={i18nTexts.searchBoxPlaceholder}
              className="componentTemplates__searchBox"
              data-test-subj="componentTemplateSearchBox"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FilterListButton filters={filters} onChange={setFilters} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <div
        className={classNames('eui-yScrollWithShadows componentTemplates__listWrapper', {
          'componentTemplates__listWrapper--is-empty': isSearchResultEmpty,
        })}
      >
        {isSearchResultEmpty ? (
          renderEmptyResult()
        ) : (
          <ComponentTemplatesList components={filteredComponents} listItemProps={listItemProps} />
        )}
      </div>
    </div>
  );
};
