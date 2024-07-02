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
  EuiHighlight,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiIcon,
} from '@elastic/eui';

import { css } from '@emotion/react';
import { PromptResponse } from '@kbn/elastic-assistant-common';
import { TEST_IDS } from '../../../../constants';
import * as i18n from './translations';
import { SYSTEM_PROMPT_DEFAULT_NEW_CONVERSATION } from '../translations';

export const SYSTEM_PROMPT_SELECTOR_CLASSNAME = 'systemPromptSelector';

interface Props {
  autoFocus?: boolean;
  onSystemPromptDeleted: (systemPromptTitle: string) => void;
  onSystemPromptSelectionChange: (systemPrompt?: PromptResponse | string) => void;
  systemPrompts: PromptResponse[];
  selectedSystemPrompt?: PromptResponse;
  resetSettings?: () => void;
}

export type SystemPromptSelectorOption = EuiComboBoxOptionOption<{
  isDefault: boolean;
  isNewConversationDefault: boolean;
}>;

/**
 * Selector for choosing and deleting System Prompts
 */
export const SystemPromptSelector: React.FC<Props> = React.memo(
  ({
    autoFocus = false,
    onSystemPromptDeleted,
    onSystemPromptSelectionChange,
    resetSettings,
    selectedSystemPrompt,
    systemPrompts,
  }) => {
    // Form options
    const [options, setOptions] = useState<SystemPromptSelectorOption[]>(
      systemPrompts.map((sp) => ({
        value: {
          isDefault: sp.isDefault ?? false,
          isNewConversationDefault: sp.isNewConversationDefault ?? false,
        },
        label: sp.name,
        id: sp.id,
        'data-test-subj': `${TEST_IDS.SYSTEM_PROMPT_SELECTOR}-${sp.id}`,
      }))
    );
    const selectedOptions = useMemo<SystemPromptSelectorOption[]>(() => {
      return selectedSystemPrompt
        ? [
            {
              value: {
                isDefault: selectedSystemPrompt.isDefault ?? false,
                isNewConversationDefault: selectedSystemPrompt.isNewConversationDefault ?? false,
              },
              id: selectedSystemPrompt.id,
              label: selectedSystemPrompt.name,
            },
          ]
        : [];
    }, [selectedSystemPrompt]);

    const handleSelectionChange = useCallback(
      (systemPromptSelectorOption: SystemPromptSelectorOption[]) => {
        // Reset settings on every selection change to avoid option saved automatically on settings management page
        resetSettings?.();
        const newSystemPrompt =
          systemPromptSelectorOption.length === 0
            ? undefined
            : systemPrompts.find((sp) => sp.name === systemPromptSelectorOption[0]?.label) ??
              systemPromptSelectorOption[0]?.label;
        onSystemPromptSelectionChange(newSystemPrompt);
      },
      [onSystemPromptSelectionChange, resetSettings, systemPrompts]
    );

    // Callback for when user types to create a new system prompt
    const onCreateOption = useCallback(
      (searchValue, flattenedOptions = []) => {
        if (!searchValue || !searchValue.trim().toLowerCase()) {
          return;
        }

        const normalizedSearchValue = searchValue.trim().toLowerCase();
        const optionExists =
          flattenedOptions.findIndex(
            (option: SystemPromptSelectorOption) =>
              option.label.trim().toLowerCase() === normalizedSearchValue
          ) !== -1;

        const newOption = {
          value: searchValue,
          id: searchValue,
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
      (newOptions: SystemPromptSelectorOption[]) => {
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
        const deleteId = options.find((o) => o.label === label)?.id;
        setOptions(options.filter((o) => o.label !== label));
        if (selectedOptions?.[0]?.label === label) {
          handleSelectionChange([]);
        }
        onSystemPromptDeleted(deleteId ?? label);
      },
      [handleSelectionChange, onSystemPromptDeleted, options, selectedOptions]
    );

    const renderOption: (
      option: SystemPromptSelectorOption,
      searchValue: string,
      OPTION_CONTENT_CLASSNAME: string
    ) => React.ReactNode = (option, searchValue, contentClassName) => {
      const { label, value } = option;
      return (
        <EuiFlexGroup
          alignItems="center"
          className={'parentFlexGroup'}
          component={'span'}
          justifyContent="spaceBetween"
          data-test-subj="systemPromptOptionSelector"
        >
          <EuiFlexItem
            grow={false}
            component={'span'}
            css={css`
              width: calc(100% - 60px);
            `}
          >
            <EuiFlexGroup alignItems="center" component={'span'} gutterSize={'s'}>
              <EuiFlexItem
                component={'span'}
                grow={false}
                css={css`
                  max-width: 100%;
                `}
              >
                <EuiHighlight
                  search={searchValue}
                  css={css`
                    overflow: hidden;
                    text-overflow: ellipsis;
                  `}
                >
                  {label}
                </EuiHighlight>
              </EuiFlexItem>
              {value?.isNewConversationDefault && (
                <EuiFlexItem grow={false} component={'span'}>
                  <EuiToolTip position="right" content={SYSTEM_PROMPT_DEFAULT_NEW_CONVERSATION}>
                    <EuiIcon type={'starFilled'} />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>

          {!value?.isDefault && (
            <EuiFlexItem grow={false} component={'span'}>
              <EuiToolTip position="right" content={i18n.DELETE_SYSTEM_PROMPT}>
                <EuiButtonIcon
                  iconType="cross"
                  aria-label={i18n.DELETE_SYSTEM_PROMPT}
                  color="danger"
                  data-test-subj="delete-prompt"
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
        aria-label={i18n.SYSTEM_PROMPT_SELECTOR}
        className={SYSTEM_PROMPT_SELECTOR_CLASSNAME}
        compressed
        data-test-subj={TEST_IDS.SYSTEM_PROMPT_SELECTOR}
        fullWidth
        placeholder={i18n.SYSTEM_PROMPT_SELECTOR}
        customOptionText={`${i18n.CUSTOM_OPTION_TEXT} {searchValue}`}
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selectedOptions}
        onChange={onChange}
        onCreateOption={onCreateOption}
        renderOption={renderOption}
        autoFocus={autoFocus}
      />
    );
  }
);

SystemPromptSelector.displayName = 'SystemPromptSelector';
