/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiToolTip,
  EuiHealth,
  EuiHighlight,
  EuiComboBox,
  EuiComboBoxOptionOption,
} from '@elastic/eui';

import { css } from '@emotion/react';
import * as i18n from './translations';
import { QuickPrompt } from '../types';

interface Props {
  isDisabled?: boolean;
  onQuickPromptDeleted: (quickPromptTitle: string) => void;
  onQuickPromptSelectionChange: (quickPrompt?: QuickPrompt | string) => void;
  quickPrompts: QuickPrompt[];
  selectedQuickPrompt?: QuickPrompt;
}

export type QuickPromptSelectorOption = EuiComboBoxOptionOption<{ isDefault: boolean }>;

/**
 * Selector for choosing and deleting Quick Prompts
 */
export const QuickPromptSelector: React.FC<Props> = React.memo(
  ({
    isDisabled = false,
    quickPrompts,
    onQuickPromptDeleted,
    onQuickPromptSelectionChange,
    selectedQuickPrompt,
  }) => {
    // Form options
    const [options, setOptions] = useState<QuickPromptSelectorOption[]>(
      quickPrompts.map((qp) => ({
        value: {
          isDefault: qp.isDefault ?? false,
        },
        label: qp.title,
        'data-test-subj': qp.title,
        color: qp.color,
      }))
    );
    const selectedOptions = useMemo<QuickPromptSelectorOption[]>(() => {
      return selectedQuickPrompt
        ? [
            {
              value: {
                isDefault: true,
              },
              label: selectedQuickPrompt.title,
              color: selectedQuickPrompt.color,
            },
          ]
        : [];
    }, [selectedQuickPrompt]);

    const handleSelectionChange = useCallback(
      (quickPromptSelectorOption: QuickPromptSelectorOption[]) => {
        const newQuickPrompt =
          quickPromptSelectorOption.length === 0
            ? undefined
            : quickPrompts.find((qp) => qp.title === quickPromptSelectorOption[0]?.label) ??
              quickPromptSelectorOption[0]?.label;
        onQuickPromptSelectionChange(newQuickPrompt);
      },
      [onQuickPromptSelectionChange, quickPrompts]
    );

    // Callback for when user types to create a new quick prompt
    const onCreateOption = useCallback(
      (searchValue, flattenedOptions = []) => {
        if (!searchValue || !searchValue.trim().toLowerCase()) {
          return;
        }

        const normalizedSearchValue = searchValue.trim().toLowerCase();
        const optionExists =
          flattenedOptions.findIndex(
            (option: QuickPromptSelectorOption) =>
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

    // Callback for when user selects a quick prompt
    const onChange = useCallback(
      (newOptions: QuickPromptSelectorOption[]) => {
        if (newOptions.length === 0) {
          handleSelectionChange([]);
        } else if (options.findIndex((o) => o.label === newOptions?.[0].label) !== -1) {
          handleSelectionChange(newOptions);
        }
      },
      [handleSelectionChange, options]
    );

    // Callback for when user deletes a quick prompt
    const onDelete = useCallback(
      (label: string) => {
        setOptions(options.filter((o) => o.label !== label));
        if (selectedOptions?.[0]?.label === label) {
          handleSelectionChange([]);
        }
        onQuickPromptDeleted(label);
      },
      [handleSelectionChange, onQuickPromptDeleted, options, selectedOptions]
    );

    const renderOption: (
      option: QuickPromptSelectorOption,
      searchValue: string,
      OPTION_CONTENT_CLASSNAME: string
    ) => React.ReactNode = (option, searchValue, contentClassName) => {
      const { color, label, value } = option;
      return (
        <EuiFlexGroup
          alignItems="center"
          className={'parentFlexGroup'}
          component={'span'}
          justifyContent="spaceBetween"
        >
          <EuiFlexItem
            component={'span'}
            grow={false}
            css={css`
              width: calc(100% - 60px);
            `}
          >
            <EuiHealth
              color={color}
              css={css`
                overflow: hidden;
              `}
            >
              <EuiHighlight search={searchValue}>{label}</EuiHighlight>
            </EuiHealth>
          </EuiFlexItem>
          {!value?.isDefault && (
            <EuiFlexItem grow={false}>
              <EuiToolTip position="right" content={i18n.DELETE_QUICK_PROMPT_}>
                <EuiButtonIcon
                  iconType="cross"
                  aria-label={i18n.DELETE_QUICK_PROMPT_}
                  data-test-subj="delete-quick-prompt"
                  color="danger"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onDelete(label);
                  }}
                  css={css`
                    visibility: hidden;
                    .parentFlexGroup:hover & {
                      visibility: visible;
                    }
                  `}
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    };

    return (
      <EuiComboBox
        data-test-subj="quickPromptSelector"
        aria-label={i18n.QUICK_PROMPT_SELECTOR}
        compressed
        isDisabled={isDisabled}
        placeholder={i18n.QUICK_PROMPT_SELECTOR}
        customOptionText={`${i18n.CUSTOM_OPTION_TEXT} {searchValue}`}
        singleSelection={true}
        options={options}
        selectedOptions={selectedOptions}
        onChange={onChange}
        onCreateOption={onCreateOption}
        renderOption={renderOption}
        fullWidth
      />
    );
  }
);

QuickPromptSelector.displayName = 'QuickPromptSelector';
