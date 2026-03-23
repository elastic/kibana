/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiFilterGroup,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { TemplatesSearch } from './templates_search';
import { MultiSelectFilter, mapToMultiSelectOption } from '../../all_cases/multi_select_filter';
import type { TemplatesFindRequest } from '../../../../common/types/api/template/v1';
import * as i18n from '../../templates/translations';

export interface TemplatesTableFiltersProps {
  queryParams: TemplatesFindRequest;
  onQueryParamsChange: (params: Partial<TemplatesFindRequest>) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  availableTags?: string[];
  availableCreatedBy?: string[];
  isLoadingTags?: boolean;
  isLoadingCreators?: boolean;
}

const TemplatesTableFiltersComponent: React.FC<TemplatesTableFiltersProps> = ({
  queryParams,
  onQueryParamsChange,
  onRefresh,
  isLoading = false,
  availableTags = [],
  availableCreatedBy = [],
  isLoadingTags = false,
  isLoadingCreators = false,
}) => {
  const { euiTheme } = useEuiTheme();

  const onSearchChange = useCallback(
    (search: string) => {
      onQueryParamsChange({ search, page: 1 });
    },
    [onQueryParamsChange]
  );

  const onTagsChange = useCallback(
    ({ selectedOptionKeys }: { filterId: string; selectedOptionKeys: string[] }) => {
      onQueryParamsChange({ tags: selectedOptionKeys, page: 1 });
    },
    [onQueryParamsChange]
  );

  const onAuthorChange = useCallback(
    ({ selectedOptionKeys }: { filterId: string; selectedOptionKeys: string[] }) => {
      onQueryParamsChange({ author: selectedOptionKeys, page: 1 });
    },
    [onQueryParamsChange]
  );

  return (
    <EuiFlexGroup
      gutterSize="s"
      justifyContent="flexStart"
      wrap={true}
      data-test-subj="templates-table-filters"
      css={css`
        margin-top: ${euiTheme.size.l};
        margin-bottom: ${euiTheme.size.l};
      `}
    >
      <EuiFlexItem>
        <TemplatesSearch
          search={queryParams.search}
          onSearchChange={onSearchChange}
          key={queryParams.search}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup
          css={css`
            background-color: transparent;
          `}
        >
          <MultiSelectFilter
            id="tags"
            buttonLabel={i18n.TAGS}
            options={mapToMultiSelectOption(availableTags)}
            selectedOptionKeys={queryParams.tags}
            onChange={onTagsChange}
            isLoading={isLoadingTags}
          />
          <MultiSelectFilter
            id="author"
            buttonLabel={i18n.CREATED_BY}
            options={mapToMultiSelectOption(availableCreatedBy)}
            selectedOptionKeys={queryParams.author}
            onChange={onAuthorChange}
            isLoading={isLoadingCreators}
          />
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="refresh"
          onClick={onRefresh}
          isLoading={isLoading}
          aria-label={i18n.REFRESH_TEMPLATES}
          data-test-subj="templates-refresh-button"
          display="base"
          size="m"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

TemplatesTableFiltersComponent.displayName = 'TemplatesTableFiltersComponent';

export const TemplatesTableFilters = React.memo(TemplatesTableFiltersComponent);
