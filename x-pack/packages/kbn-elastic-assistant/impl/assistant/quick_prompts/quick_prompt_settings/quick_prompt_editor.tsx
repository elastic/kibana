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
import { PromptContextTemplate } from '../../../..';
import * as i18n from './translations';
import { QuickPrompt } from '../types';
import { QuickPromptSelector } from '../quick_prompt_selector/quick_prompt_selector';
import { PromptContextSelector } from '../prompt_context_selector/prompt_context_selector';
import { useAssistantContext } from '../../../assistant_context';
import { useQuickPromptEditor } from './use_quick_prompt_editor';

const DEFAULT_COLOR = '#D36086';

interface Props {
  onSelectedQuickPromptChange: (quickPrompt?: QuickPrompt) => void;
  quickPromptSettings: QuickPrompt[];
  resetSettings?: () => void;
  selectedQuickPrompt: QuickPrompt | undefined;
  setUpdatedQuickPromptSettings: React.Dispatch<React.SetStateAction<QuickPrompt[]>>;
}

const QuickPromptSettingsEditorComponent = ({
  onSelectedQuickPromptChange,
  quickPromptSettings,
  resetSettings,
  selectedQuickPrompt,
  setUpdatedQuickPromptSettings,
}: Props) => {
  const { basePromptContexts } = useAssistantContext();

  // Prompt
  const prompt = useMemo(
    // Fixing Cursor Jump in text area
    () => quickPromptSettings.find((p) => p.title === selectedQuickPrompt?.title)?.prompt ?? '',
    [selectedQuickPrompt?.title, quickPromptSettings]
  );

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (selectedQuickPrompt != null) {
        setUpdatedQuickPromptSettings((prev) => {
          const alreadyExists = prev.some((qp) => qp.title === selectedQuickPrompt.title);

          if (alreadyExists) {
            return prev.map((qp) => {
              if (qp.title === selectedQuickPrompt.title) {
                return {
                  ...qp,
                  prompt: e.target.value,
                };
              }
              return qp;
            });
          }

          return prev;
        });
      }
    },
    [selectedQuickPrompt, setUpdatedQuickPromptSettings]
  );

  // Color
  const selectedColor = useMemo(
    () => selectedQuickPrompt?.color ?? DEFAULT_COLOR,
    [selectedQuickPrompt?.color]
  );

  const handleColorChange = useCallback<EuiSetColorMethod>(
    (color, { hex, isValid }) => {
      if (selectedQuickPrompt != null) {
        setUpdatedQuickPromptSettings((prev) => {
          const alreadyExists = prev.some((qp) => qp.title === selectedQuickPrompt.title);

          if (alreadyExists) {
            return prev.map((qp) => {
              if (qp.title === selectedQuickPrompt.title) {
                return {
                  ...qp,
                  color,
                };
              }
              return qp;
            });
          }
          return prev;
        });
      }
    },
    [selectedQuickPrompt, setUpdatedQuickPromptSettings]
  );

  // Prompt Contexts
  const selectedPromptContexts = useMemo(
    () =>
      basePromptContexts.filter((bpc) =>
        selectedQuickPrompt?.categories?.some((cat) => bpc?.category === cat)
      ) ?? [],
    [basePromptContexts, selectedQuickPrompt?.categories]
  );

  const onPromptContextSelectionChange = useCallback(
    (pc: PromptContextTemplate[]) => {
      if (selectedQuickPrompt != null) {
        setUpdatedQuickPromptSettings((prev) => {
          const alreadyExists = prev.some((qp) => qp.title === selectedQuickPrompt.title);

          if (alreadyExists) {
            return prev.map((qp) => {
              if (qp.title === selectedQuickPrompt.title) {
                return {
                  ...qp,
                  categories: pc.map((p) => p.category),
                };
              }
              return qp;
            });
          }
          return prev;
        });
      }
    },
    [selectedQuickPrompt, setUpdatedQuickPromptSettings]
  );

  // When top level quick prompt selection changes
  const { onQuickPromptDeleted, onQuickPromptSelectionChange } = useQuickPromptEditor({
    onSelectedQuickPromptChange,
    setUpdatedQuickPromptSettings,
  });

  return (
    <>
      <EuiFormRow label={i18n.QUICK_PROMPT_NAME} display="rowCompressed" fullWidth>
        <QuickPromptSelector
          onQuickPromptDeleted={onQuickPromptDeleted}
          onQuickPromptSelectionChange={onQuickPromptSelectionChange}
          quickPrompts={quickPromptSettings}
          resetSettings={resetSettings}
          selectedQuickPrompt={selectedQuickPrompt}
        />
      </EuiFormRow>

      <EuiFormRow label={i18n.QUICK_PROMPT_PROMPT} display="rowCompressed" fullWidth>
        <EuiTextArea
          compressed
          disabled={selectedQuickPrompt == null}
          fullWidth
          data-test-subj="quick-prompt-prompt"
          onChange={handlePromptChange}
          placeholder={i18n.QUICK_PROMPT_PROMPT_PLACEHOLDER}
          value={prompt}
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
          onPromptContextSelectionChange={onPromptContextSelectionChange}
          promptContexts={basePromptContexts}
          selectedPromptContexts={selectedPromptContexts}
        />
      </EuiFormRow>

      <EuiFormRow display="rowCompressed" label={i18n.QUICK_PROMPT_BADGE_COLOR}>
        <EuiColorPicker
          color={selectedColor}
          compressed
          disabled={selectedQuickPrompt == null}
          onChange={handleColorChange}
        />
      </EuiFormRow>
    </>
  );
};
export const QuickPromptSettingsEditor = memo(QuickPromptSettingsEditorComponent);

QuickPromptSettingsEditor.displayName = 'QuickPromptSettingsEditor';
