/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldSearch, EuiFilterGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { AiIndexType } from '../../../../common/http_api/ai_indices';
import type { UseAiIndexListStateResult } from '../../hooks/use_ai_index_list_state';
import type { AiIndexOwner } from '../../utils/ai_index_owner';
import { AI_INDEX_OWNER_LABEL, AI_INDEX_TYPE_LABEL } from './labels';
import { MultiSelectFilter } from './multi_select_filter';

const TYPE_OPTIONS: ReadonlyArray<{ value: AiIndexType; label: string }> = [
  { value: 'index', label: AI_INDEX_TYPE_LABEL.index },
  { value: 'data_stream', label: AI_INDEX_TYPE_LABEL.data_stream },
];

const OWNER_OPTIONS: ReadonlyArray<{ value: AiIndexOwner; label: string }> = [
  { value: 'managed', label: AI_INDEX_OWNER_LABEL.managed },
  { value: 'user', label: AI_INDEX_OWNER_LABEL.user },
];

type AiIndexListControlsProps = Pick<
  UseAiIndexListStateResult,
  'filters' | 'setQuery' | 'setTypes' | 'setOwners'
>;

export const AiIndexListControls = ({
  filters,
  setQuery,
  setTypes,
  setOwners,
}: AiIndexListControlsProps) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
    <EuiFlexItem>
      <EuiFieldSearch
        fullWidth
        incremental
        data-test-subj="contextAiIndexListSearch"
        placeholder={i18n.translate('xpack.contextEngine.landing.searchPlaceholder', {
          defaultMessage: 'Search AI Indexes',
        })}
        value={filters.query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiFilterGroup>
        <MultiSelectFilter
          data-test-subj="contextAiIndexListTypeFilter"
          label={i18n.translate('xpack.contextEngine.landing.typeFilterLabel', {
            defaultMessage: 'Type',
          })}
          options={TYPE_OPTIONS}
          selected={filters.types}
          onChange={setTypes}
        />
        <MultiSelectFilter
          data-test-subj="contextAiIndexListOwnerFilter"
          label={i18n.translate('xpack.contextEngine.landing.ownerFilterLabel', {
            defaultMessage: 'Owner',
          })}
          options={OWNER_OPTIONS}
          selected={filters.owners}
          onChange={setOwners}
        />
      </EuiFilterGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
);
