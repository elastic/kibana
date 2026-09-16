/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFormRow, type EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/react-hooks';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AiIndexTrace } from '../../../../common/http_api/ai_indices';
import { validateAiIndexTraceIndexName } from '../../../../common/validation';
import { useKibana } from '../../hooks/use_kibana';

interface DataStreamFieldProps {
  value: AiIndexTrace | undefined;
  onChange: (trace: AiIndexTrace | undefined) => void;
}

const SEARCH_DEBOUNCE_MS = 300;

const isDataStreamMatch = (tags: Array<{ key: string }>): boolean =>
  tags.some((tag) => tag.key === 'data_stream');

export const DataStreamField = ({ value, onChange }: DataStreamFieldProps) => {
  const {
    services: {
      data: { dataViews },
    },
  } = useKibana();
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebouncedValue(searchValue, SEARCH_DEBOUNCE_MS);
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const selectedValue = value?.type === 'index' ? value.value : undefined;
  const validationError =
    selectedValue !== undefined ? validateAiIndexTraceIndexName(selectedValue) : undefined;

  const selectedOptions = useMemo(() => {
    if (selectedValue === undefined) {
      return [];
    }
    return [{ label: selectedValue, value: selectedValue }];
  }, [selectedValue]);

  const loadOptions = useCallback(
    async (search: string) => {
      setIsLoading(true);
      try {
        const pattern = search.length > 0 ? `${search}*` : '*';
        const matches = await dataViews.getIndices({
          pattern,
          isRollupIndex: () => false,
        });
        setOptions(
          matches
            .filter((item) => isDataStreamMatch(item.tags))
            .map((item) => ({ label: item.name, value: item.name }))
        );
      } finally {
        setIsLoading(false);
      }
    },
    [dataViews]
  );

  useEffect(() => {
    void loadOptions(debouncedSearch);
  }, [debouncedSearch, loadOptions]);

  const handleChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
    const next = selected[0]?.value;
    onChange(next ? { type: 'index', value: next } : undefined);
  };

  const handleCreateOption = (search: string) => {
    const trimmed = search.trim();
    if (trimmed.length > 0) {
      onChange({ type: 'index', value: trimmed });
    }
  };

  return (
    <EuiFormRow
      label={i18n.translate('xpack.contextEngine.traceSelector.dataStreamField.label', {
        defaultMessage: 'Data stream',
      })}
      helpText={i18n.translate('xpack.contextEngine.traceSelector.dataStreamField.helpText', {
        defaultMessage:
          'Data streams carrying OTel GenAI spans from external harnesses — LangChain, LlamaIndex, the OpenAI SDK.',
      })}
      error={validationError}
      isInvalid={validationError !== undefined}
      fullWidth
    >
      <EuiComboBox
        isInvalid={validationError !== undefined}
        singleSelection={{ asPlainText: true }}
        fullWidth
        async
        isLoading={isLoading}
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        onSearchChange={setSearchValue}
        onCreateOption={handleCreateOption}
        customOptionText="Add {searchValue} as a data stream"
        placeholder={i18n.translate(
          'xpack.contextEngine.traceSelector.dataStreamField.placeholder',
          {
            defaultMessage: 'Search data streams',
          }
        )}
        aria-label={i18n.translate('xpack.contextEngine.traceSelector.dataStreamField.ariaLabel', {
          defaultMessage: 'Data stream trace source',
        })}
        data-test-subj="contextTraceDataStreamComboBox"
      />
    </EuiFormRow>
  );
};
