/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { TemplatesSearch } from './templates_search';
import type { QueryParams } from './types';
import * as i18n from '../templates/translations';

export interface TemplatesTableFiltersProps {
  queryParams: QueryParams;
  onQueryParamsChange: (params: Partial<QueryParams>) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

const TemplatesTableFiltersComponent: React.FC<TemplatesTableFiltersProps> = ({
  queryParams,
  onQueryParamsChange,
  onRefresh,
  isLoading = false,
}) => {
  const { euiTheme } = useEuiTheme();

  const onSearchChange = useCallback(
    (search: string) => {
      onQueryParamsChange({ search, page: 1 });
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
