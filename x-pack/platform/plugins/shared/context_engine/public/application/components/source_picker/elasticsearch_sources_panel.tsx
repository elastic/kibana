/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFormRow, EuiProgress } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { AggregateQuery } from '@kbn/es-query';
import { ESQLLangEditor } from '@kbn/esql/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDebouncedValue } from '@kbn/react-hooks';
import React, { useMemo, useState } from 'react';
import { useIndices } from '../../hooks/use_indices';
import { isIndexPickerSourceSelected } from '../../utils/sources';
import type { SelectedSource } from './types';

const EDITOR_INLINE_MIN_HEIGHT = 180;
const SEARCH_DEBOUNCE_MS = 300;

const getEsqlQuery = (query: AggregateQuery): string => ('esql' in query ? query.esql : '');

export type ElasticsearchSourceMode = 'index' | 'esql';

interface ElasticsearchSourcesPanelProps {
  selectedSources: SelectedSource[];
  onAddIndex: (indexName: string) => void;
  esqlQuery: string;
  onEsqlQueryChange: (query: string) => void;
  disabled?: boolean;
  mode?: ElasticsearchSourceMode;
}

export const ElasticsearchSourcesPanel = ({
  selectedSources,
  onAddIndex,
  esqlQuery,
  onEsqlQueryChange,
  disabled = false,
  mode = 'index',
}: ElasticsearchSourcesPanelProps) => {
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebouncedValue(searchValue, SEARCH_DEBOUNCE_MS);
  const [hasFocused, setHasFocused] = useState(false);

  const { indexNames, isFetching } = useIndices({
    search: debouncedSearch.trim(),
    enabled: hasFocused,
  });

  const indexOptions = useMemo<EuiComboBoxOptionOption<string>[]>(
    () =>
      indexNames
        .filter((name) => !isIndexPickerSourceSelected(selectedSources, name))
        .map((name) => ({ label: name, value: name })),
    [indexNames, selectedSources]
  );

  const addIndexFromCombo = (indexName: string) => {
    const trimmed = indexName.trim();
    if (!trimmed) {
      return;
    }
    onAddIndex(trimmed);
    setSearchValue('');
  };

  const handleIndexChange = (nextSelectedOptions: EuiComboBoxOptionOption<string>[]) => {
    const picked = nextSelectedOptions[0]?.value;
    if (picked) {
      addIndexFromCombo(picked);
    }
  };

  const handleFocus = () => {
    setHasFocused(true);
  };

  return (
    <div data-test-subj="contextElasticsearchSourcesPanel">
      <EuiProgress
        size="xs"
        color="accent"
        css={{ visibility: isFetching ? 'visible' : 'hidden' }}
        data-test-subj="contextIndexComboBoxLoadingBar"
      />
      {mode === 'index' ? (
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.contextEngine.sourcePicker.index.fieldLabel"
              defaultMessage="Index, data stream or alias"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.contextEngine.sourcePicker.index.fieldHelp"
              defaultMessage="Start typing to search, then select a match from the list."
            />
          }
        >
          <EuiComboBox
            async
            fullWidth
            singleSelection={{ asPlainText: true }}
            sortMatchesBy="startsWith"
            selectedOptions={[]}
            isClearable={false}
            isDisabled={disabled}
            aria-label={i18n.translate('xpack.contextEngine.sourcePicker.index.comboAriaLabel', {
              defaultMessage: 'Select an index, data stream or alias',
            })}
            placeholder={i18n.translate('xpack.contextEngine.sourcePicker.index.comboPlaceholder', {
              defaultMessage: 'e.g. logs-nginx',
            })}
            options={indexOptions}
            onChange={handleIndexChange}
            onSearchChange={setSearchValue}
            onFocus={handleFocus}
            data-test-subj="contextIndexComboBox"
          />
        </EuiFormRow>
      ) : (
        <div data-test-subj="contextAdvancedEsqlEditor">
          <EuiFormRow fullWidth>
            <div css={{ minHeight: EDITOR_INLINE_MIN_HEIGHT }}>
              <ESQLLangEditor
                query={{ esql: esqlQuery }}
                onTextLangQueryChange={(next) => onEsqlQueryChange(getEsqlQuery(next))}
                onTextLangQuerySubmit={async () => {}}
                editorIsInline
                hasOutline
                hideRunQueryButton
                hideQueryHistory
                expandToFitQueryOnMount
                isLoading={false}
              />
            </div>
          </EuiFormRow>
        </div>
      )}
    </div>
  );
};
