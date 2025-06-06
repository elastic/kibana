/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiFormRow, EuiColorPicker, EuiTextArea } from '@elastic/eui';

import { EuiSetColorMethod } from '@elastic/eui/src/services/color_picker/color_picker';
import { css } from '@emotion/react';
import { PromptResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import { PromptContextTemplate } from '../../../..';
import { getRandomEuiColor } from './helpers';
import * as i18n from './translations';
import { QuickPromptSelector } from '../quick_prompt_selector/quick_prompt_selector';
import { PromptContextSelector } from '../prompt_context_selector/prompt_context_selector';
import { useAssistantContext } from '../../../assistant_context';

interface Props {
  onPromptContentChange: (newValue: string) => void;
  onQuickPromptColorChange: EuiSetColorMethod;
  onQuickPromptContextChange: (promptContexts: PromptContextTemplate[]) => void;
  onQuickPromptDelete: (id: string) => void;
  onQuickPromptSelect: (quickPrompt?: PromptResponse | string) => void;
  resetSettings?: () => void;
  selectedQuickPrompt: PromptResponse | undefined;
  quickPromptSettings: PromptResponse[];
}

const QuickPromptSettingsEditorComponent = ({
  onPromptContentChange,
  onQuickPromptColorChange,
  onQuickPromptContextChange,
  onQuickPromptDelete,
  onQuickPromptSelect,
  resetSettings,
  selectedQuickPrompt,
  quickPromptSettings,
}: Props) => {
  const { basePromptContexts } = useAssistantContext();

  // Prompt
  const promptContent = useMemo(
    // Fixing Cursor Jump in text area
    () => selectedQuickPrompt?.content ?? '',
    [selectedQuickPrompt?.content]
  );

  const setDefaultPromptColor = useCallback((): string => {
    const randomColor = getRandomEuiColor();
    onQuickPromptColorChange(randomColor, { hex: randomColor, isValid: true });
    return randomColor;
  }, [onQuickPromptColorChange]);

  // Color
  const selectedColor = useMemo(
    () => selectedQuickPrompt?.color ?? setDefaultPromptColor(),
    [selectedQuickPrompt?.color, setDefaultPromptColor]
  );
  // Prompt Contexts
  const selectedPromptContexts = useMemo(
    () =>
      basePromptContexts.filter((bpc) =>
        selectedQuickPrompt?.categories?.some((cat) => bpc?.category === cat)
      ) ?? [],
    [basePromptContexts, selectedQuickPrompt?.categories]
  );

  const onContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => onPromptContentChange(e.target.value),
    [onPromptContentChange]
  );

  return (
    <>
      <EuiFormRow label={i18n.QUICK_PROMPT_NAME} display="rowCompressed" fullWidth>
        <QuickPromptSelector
          onQuickPromptDeleted={onQuickPromptDelete}
          onQuickPromptSelectionChange={onQuickPromptSelect}
          quickPrompts={quickPromptSettings}
          resetSettings={resetSettings}
          selectedQuickPrompt={selectedQuickPrompt}
          selectedColor={selectedColor}
        />
      </EuiFormRow>

      <EuiFormRow label={i18n.QUICK_PROMPT_PROMPT} display="rowCompressed" fullWidth>
        <EuiTextArea
          compressed
          disabled={selectedQuickPrompt == null}
          fullWidth
          data-test-subj="quick-prompt-prompt"
          onChange={onContentChange}
          placeholder={i18n.QUICK_PROMPT_PROMPT_PLACEHOLDER}
          value={promptContent}
          css={css`
            min-height: 150px;
          `}
        />
      </EuiFormRow>

      <EuiFormRow
        display="rowCompressed"
        fullWidth
        label={i18n.QUICK_PROMPT_CONTEXTS}
        helpText={i18n.QUICK_PROMPT_CONTEXTS_HELP_TEXT}
      >
        <PromptContextSelector
          isDisabled={selectedQuickPrompt == null}
          onPromptContextSelectionChange={onQuickPromptContextChange}
          promptContexts={basePromptContexts}
          selectedPromptContexts={selectedPromptContexts}
        />
      </EuiFormRow>

      <EuiFormRow display="rowCompressed" label={i18n.QUICK_PROMPT_BADGE_COLOR}>
        <EuiColorPicker
          color={selectedColor}
          compressed
          disabled={selectedQuickPrompt == null}
          onChange={onQuickPromptColorChange}
        />
      </EuiFormRow>
    </>
  );
};
export const QuickPromptSettingsEditor = memo(QuickPromptSettingsEditorComponent);

QuickPromptSettingsEditor.displayName = 'QuickPromptSettingsEditor';
