/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import * as i18n from './translations';

export const MODEL_GPT_4_TURBO = 'gpt-4-turbo';
export const MODEL_GPT_4O_MINI = 'gpt-4o-mini';
export const MODEL_GPT_4O = 'gpt-4o';
const DEFAULT_MODELS = [MODEL_GPT_4O, MODEL_GPT_4_TURBO, MODEL_GPT_4O_MINI];

interface Props {
  onModelSelectionChange?: (model?: string) => void;
  models?: string[];
  selectedModel?: string;
}

/**
 * Selector for choosing and deleting models
 *
 * TODO: Pull from API once connector supports it `GET https://api.openai.com/v1/models` as models are added/deprecated
 */
export const ModelSelector: React.FC<Props> = React.memo(
  ({ models = DEFAULT_MODELS, onModelSelectionChange, selectedModel = DEFAULT_MODELS[0] }) => {
    // Form options
    const [options, setOptions] = useState<EuiComboBoxOptionOption[]>(
      models.map((model) => ({ 'data-test-subj': model, label: model }))
    );
    const selectedOptions = useMemo<EuiComboBoxOptionOption[]>(() => {
      return selectedModel ? [{ label: selectedModel }] : [];
    }, [selectedModel]);

    const handleSelectionChange = useCallback(
      (modelSelectorOption: EuiComboBoxOptionOption[]) => {
        const newModel =
          modelSelectorOption.length === 0
            ? undefined
            : models.find((model) => model === modelSelectorOption[0]?.label) ??
              modelSelectorOption[0]?.label;
        onModelSelectionChange?.(newModel);
      },
      [onModelSelectionChange, models]
    );

    // Callback for when user types to create a new model
    const onCreateOption = useCallback(
      (searchValue, flattenedOptions = []) => {
        if (!searchValue || !searchValue.trim().toLowerCase()) {
          return;
        }

        const normalizedSearchValue = searchValue.trim().toLowerCase();
        const optionExists =
          flattenedOptions.findIndex(
            (option: EuiComboBoxOptionOption) =>
              option.label.trim().toLowerCase() === normalizedSearchValue
          ) !== -1;

        const newOption = {
          value: searchValue,
          label: searchValue,
        };

        if (!optionExists) {
          setOptions([...options, newOption]);
        }
        handleSelectionChange([newOption]);
      },
      [handleSelectionChange, options]
    );

    // Callback for when user selects a model
    const onChange = useCallback(
      (newOptions: EuiComboBoxOptionOption[]) => {
        if (newOptions.length === 0) {
          handleSelectionChange([]);
        } else if (options.findIndex((o) => o.label === newOptions?.[0].label) !== -1) {
          handleSelectionChange(newOptions);
        }
      },
      [handleSelectionChange, options]
    );

    return (
      <EuiComboBox
        aria-label={i18n.HELP_LABEL}
        compressed
        data-test-subj="model-selector"
        isClearable={false}
        placeholder={i18n.PLACEHOLDER_TEXT}
        customOptionText={`${i18n.CUSTOM_OPTION_TEXT} {searchValue}`}
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selectedOptions}
        onChange={onChange}
        onCreateOption={onCreateOption}
        fullWidth
      />
    );
  }
);

ModelSelector.displayName = 'ModelSelector';
