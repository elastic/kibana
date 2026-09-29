/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFormRow, EuiProgress, type EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/react-hooks';
import React, { useMemo, useState } from 'react';
import { useIndices } from '../../hooks/use_indices';
import type { EditableAiIndexTrace } from './types';

interface DataStreamFieldProps {
  value: EditableAiIndexTrace | undefined;
  onChange: (trace: EditableAiIndexTrace | undefined) => void;
}

const SEARCH_DEBOUNCE_MS = 300;

export const DataStreamField = ({ value, onChange }: DataStreamFieldProps) => {
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebouncedValue(searchValue, SEARCH_DEBOUNCE_MS);
  const [hasFocused, setHasFocused] = useState(false);

  const { indexNames, isFetching } = useIndices({
    search: debouncedSearch.trim(),
    enabled: hasFocused,
    types: ['data_stream'],
  });

  const selectedValue = value?.type === 'index' ? value.value : undefined;

  const selectedOptions = useMemo(() => {
    if (selectedValue === undefined) {
      return [];
    }
    return [{ label: selectedValue, value: selectedValue }];
  }, [selectedValue]);

  const options = useMemo(
    () => indexNames.map((name) => ({ label: name, value: name })),
    [indexNames]
  );

  const handleFocus = () => {
    setHasFocused(true);
  };

  const handleChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
    const next = selected[0]?.value;
    onChange(next ? { type: 'index', value: next } : undefined);
  };

  return (
    <>
      <EuiProgress
        size="xs"
        color="accent"
        css={{ visibility: isFetching ? 'visible' : 'hidden' }}
        data-test-subj="contextTraceDataStreamComboBoxLoadingBar"
      />
      <EuiFormRow
        label={i18n.translate('xpack.contextEngine.traceSelector.dataStreamField.label', {
          defaultMessage: 'Data stream',
        })}
        helpText={i18n.translate('xpack.contextEngine.traceSelector.dataStreamField.helpText', {
          defaultMessage:
            'Data streams carrying OTel GenAI spans from external harnesses such as LangChain, LlamaIndex, or the OpenAI SDK.',
        })}
        fullWidth
      >
        <EuiComboBox
          singleSelection={{ asPlainText: true }}
          fullWidth
          async
          sortMatchesBy="startsWith"
          options={options}
          selectedOptions={selectedOptions}
          onChange={handleChange}
          onSearchChange={setSearchValue}
          onFocus={handleFocus}
          placeholder={i18n.translate(
            'xpack.contextEngine.traceSelector.dataStreamField.placeholder',
            { defaultMessage: 'Search data streams' }
          )}
          aria-label={i18n.translate(
            'xpack.contextEngine.traceSelector.dataStreamField.ariaLabel',
            { defaultMessage: 'Data stream trace source' }
          )}
          data-test-subj="contextTraceDataStreamComboBox"
        />
      </EuiFormRow>
    </>
  );
};
