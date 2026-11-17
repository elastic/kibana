/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiProgress, EuiSelectable, EuiSpacer } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDebouncedValue } from '@kbn/react-hooks';
import React, { useState } from 'react';
import { useIndices } from '../../hooks/use_indices';

const SEARCH_DEBOUNCE_MS = 300;

interface IndexMultiSelectProps {
  /** Selected indices are hidden from the list. */
  isIndexSelected: (indexName: string) => boolean;
  onSelect: (indexName: string) => void;
  disabled?: boolean;
}

export const IndexMultiSelect = ({
  isIndexSelected,
  onSelect,
  disabled = false,
}: IndexMultiSelectProps) => {
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebouncedValue(searchValue, SEARCH_DEBOUNCE_MS);

  const { indexNames, isFetching, isInitialLoading } = useIndices({
    search: debouncedSearch.trim(),
    exclude: isIndexSelected,
  });

  const options: EuiSelectableOption[] = indexNames.map((name) => ({
    label: name,
    disabled,
    'data-test-subj': `contextIndexOption-${name}`,
  }));
  const isDebouncing = searchValue.trim() !== debouncedSearch.trim();
  // Stale options stay visible under a thin bar; the full spinner is only for the first load.
  const isRefreshing = !isInitialLoading && (isFetching || isDebouncing);
  const noMatchesMessage = i18n.translate('xpack.contextEngine.sourcePicker.index.noMatches', {
    defaultMessage: 'No matches for this search.',
  });
  const emptyMessage = i18n.translate('xpack.contextEngine.sourcePicker.index.emptyMessage', {
    defaultMessage: 'No indices, data streams or aliases found.',
  });

  return (
    <EuiFormRow
      fullWidth
      label={
        <FormattedMessage
          id="xpack.contextEngine.sourcePicker.index.fieldLabel"
          defaultMessage="Index, data stream or alias"
        />
      }
      labelType="legend"
      helpText={
        <FormattedMessage
          id="xpack.contextEngine.sourcePicker.index.fieldHelp"
          defaultMessage="Start typing to search, then select a match from the list."
        />
      }
    >
      <EuiSelectable
        aria-label={i18n.translate('xpack.contextEngine.sourcePicker.index.listAriaLabel', {
          defaultMessage: 'Indices, data streams and aliases',
        })}
        searchable
        isPreFiltered
        isLoading={isInitialLoading}
        options={options}
        onChange={(_options, _event, changedOption) => onSelect(changedOption.label)}
        listProps={{ bordered: true, paddingSize: 's', rowHeight: 36, onFocusBadge: false }}
        searchProps={{
          onChange: setSearchValue,
          disabled,
          placeholder: i18n.translate('xpack.contextEngine.sourcePicker.index.searchPlaceholder', {
            defaultMessage: 'Search, e.g. logs-nginx',
          }),
          'data-test-subj': 'contextIndexSearch',
        }}
        // Stale empty results linger after clearing the search; avoid flashing the empty-cluster text.
        emptyMessage={isRefreshing ? noMatchesMessage : emptyMessage}
        noMatchesMessage={noMatchesMessage}
        data-test-subj="contextIndexSelectable"
      >
        {(list, search) => (
          <>
            {search}
            <EuiSpacer size="s" />
            <EuiProgress
              size="xs"
              color="accent"
              css={{ visibility: isRefreshing ? 'visible' : 'hidden' }}
              data-test-subj="contextIndexSelectableLoadingBar"
            />
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiFormRow>
  );
};
