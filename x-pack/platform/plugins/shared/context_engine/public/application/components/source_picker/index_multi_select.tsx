/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiSelectable, EuiSpacer } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDebouncedValue } from '@kbn/react-hooks';
import React, { useMemo, useState } from 'react';
import { useIndices } from '../../hooks/use_indices';

const SEARCH_DEBOUNCE_MS = 300;
const ROW_HEIGHT = 36;

export interface IndexToggleChange {
  name: string;
  checked: boolean;
}

interface IndexMultiSelectProps {
  selectedIndexNames: string[];
  /** Indices that are already used elsewhere and must not be offered again. */
  excludedIndexNames?: string[];
  onToggle: (change: IndexToggleChange) => void;
  disabled?: boolean;
}

export const IndexMultiSelect = ({
  selectedIndexNames,
  excludedIndexNames = [],
  onToggle,
  disabled = false,
}: IndexMultiSelectProps) => {
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebouncedValue(searchValue, SEARCH_DEBOUNCE_MS).trim();

  const { indexNames, isFetching } = useIndices({ search: debouncedSearch });

  const options = useMemo<EuiSelectableOption[]>(() => {
    const excluded = new Set(excludedIndexNames);
    const selected = new Set(selectedIndexNames);
    const loaded = new Set(indexNames);
    const normalizedSearch = debouncedSearch.toLowerCase();

    // The result list is capped, so keep checked indices visible when they match the search.
    const selectedOutsideResults = selectedIndexNames.filter(
      (name) => !loaded.has(name) && name.toLowerCase().includes(normalizedSearch)
    );

    return [...indexNames, ...selectedOutsideResults]
      .filter((name) => !excluded.has(name))
      .map((name) => ({
        key: name,
        label: name,
        checked: selected.has(name) ? 'on' : undefined,
        disabled,
        'data-test-subj': `contextIndexOption-${name}`,
      }));
  }, [indexNames, selectedIndexNames, excludedIndexNames, debouncedSearch, disabled]);

  const handleChange = (
    _options: EuiSelectableOption[],
    _event: unknown,
    changedOption: EuiSelectableOption
  ) => {
    onToggle({ name: changedOption.label, checked: changedOption.checked === 'on' });
  };

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
        selectedIndexNames.length > 0 ? (
          <FormattedMessage
            id="xpack.contextEngine.sourcePicker.index.selectedCount"
            defaultMessage="{count} selected. Select one or more."
            values={{ count: selectedIndexNames.length }}
          />
        ) : (
          <FormattedMessage
            id="xpack.contextEngine.sourcePicker.index.fieldHelp"
            defaultMessage="Search, then select one or more from the list."
          />
        )
      }
    >
      <EuiSelectable
        aria-label={i18n.translate('xpack.contextEngine.sourcePicker.index.listAriaLabel', {
          defaultMessage: 'Indices, data streams and aliases',
        })}
        searchable
        isPreFiltered
        isLoading={isFetching}
        options={options}
        onChange={handleChange}
        listProps={{ bordered: true, paddingSize: 's', rowHeight: ROW_HEIGHT, onFocusBadge: false }}
        searchProps={{
          onChange: setSearchValue,
          disabled,
          placeholder: i18n.translate('xpack.contextEngine.sourcePicker.index.searchPlaceholder', {
            defaultMessage: 'Search, e.g. logs-nginx',
          }),
          'data-test-subj': 'contextIndexSearch',
        }}
        emptyMessage={i18n.translate('xpack.contextEngine.sourcePicker.index.emptyMessage', {
          defaultMessage: 'No indices, data streams or aliases found.',
        })}
        noMatchesMessage={i18n.translate('xpack.contextEngine.sourcePicker.index.noMatches', {
          defaultMessage: 'No matches for this search.',
        })}
        data-test-subj="contextIndexSelectable"
      >
        {(list, search) => (
          <>
            {search}
            <EuiSpacer size="s" />
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiFormRow>
  );
};
