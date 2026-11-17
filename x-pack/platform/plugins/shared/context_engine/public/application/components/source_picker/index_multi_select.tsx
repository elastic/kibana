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

  const { indexNames, isFetching } = useIndices({ search: debouncedSearch.trim() });

  const options: EuiSelectableOption[] = indexNames
    .filter((name) => !isIndexSelected(name))
    .map((name) => ({
      label: name,
      disabled,
      'data-test-subj': `contextIndexOption-${name}`,
    }));

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
        isLoading={isFetching}
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
