/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiHighlight } from '@elastic/eui';

import { PromptContextTemplate } from '../../../..';
import * as i18n from './translations';

interface Props {
  isDisabled?: boolean;
  onPromptContextSelectionChange: (promptContexts: PromptContextTemplate[]) => void;
  promptContexts: PromptContextTemplate[];
  selectedPromptContexts?: PromptContextTemplate[];
}

export type PromptContextSelectorOption = EuiComboBoxOptionOption<{ category: string }>;

/**
 * Selector for choosing multiple Prompt Context Categories
 */
export const PromptContextSelector: React.FC<Props> = React.memo(
  ({ isDisabled, onPromptContextSelectionChange, promptContexts, selectedPromptContexts = [] }) => {
    // ComboBox options
    const options = useMemo<PromptContextSelectorOption[]>(
      () =>
        promptContexts.map((pc) => ({
          value: {
            category: pc.category,
          },
          label: pc.description,
          'data-test-subj': pc.description,
        })),
      [promptContexts]
    );
    const selectedOptions = useMemo<PromptContextSelectorOption[]>(() => {
      return selectedPromptContexts != null
        ? selectedPromptContexts.map((pc) => ({
            value: {
              category: pc.category,
            },
            label: pc.description,
          }))
        : [];
    }, [selectedPromptContexts]);

    const handleSelectionChange = useCallback(
      (promptContextSelectorOption: PromptContextSelectorOption[]) => {
        const newPromptSelection = promptContexts.filter((pc) =>
          promptContextSelectorOption.some((qpso) => pc.description === qpso.label)
        );
        onPromptContextSelectionChange(newPromptSelection);
      },
      [onPromptContextSelectionChange, promptContexts]
    );

    // Callback for when user selects a prompt context
    const onChange = useCallback(
      (newOptions: PromptContextSelectorOption[]) => {
        if (newOptions.length === 0) {
          handleSelectionChange([]);
        } else if (options.findIndex((o) => o.label === newOptions?.[0].label) !== -1) {
          handleSelectionChange(newOptions);
        }
      },
      [handleSelectionChange, options]
    );

    const renderOption: (
      option: PromptContextSelectorOption,
      searchValue: string,
      OPTION_CONTENT_CLASSNAME: string
    ) => React.ReactNode = (option, searchValue, contentClassName) => {
      const { label, value } = option;
      return (
        <span className={contentClassName}>
          <EuiHighlight search={searchValue}>{label}</EuiHighlight>
          <span>{` / (${value?.category})`}</span>
        </span>
      );
    };

    return (
      <EuiComboBox
        aria-label={i18n.PROMPT_CONTEXT_SELECTOR}
        compressed
        fullWidth
        isDisabled={isDisabled}
        placeholder={i18n.PROMPT_CONTEXT_SELECTOR_PLACEHOLDER}
        options={options}
        selectedOptions={selectedOptions}
        onChange={onChange}
        renderOption={renderOption}
      />
    );
  }
);

PromptContextSelector.displayName = 'PromptContextSelector';
