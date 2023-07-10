/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiFormRow,
  EuiColorPicker,
  useColorPickerState,
  EuiTextArea,
  EuiTitle,
  EuiText,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';

import { EuiSetColorMethod } from '@elastic/eui/src/services/color_picker/color_picker';
import { css } from '@emotion/react';
import { PromptContextTemplate } from '../../../..';
import * as i18n from './translations';
import { QuickPrompt } from '../types';
import { QuickPromptSelector } from '../quick_prompt_selector/quick_prompt_selector';
import { PromptContextSelector } from '../prompt_context_selector/prompt_context_selector';
import { useAssistantContext } from '../../../assistant_context';

const DEFAULT_COLOR = '#D36086';

interface Props {
  quickPromptSettings: QuickPrompt[];
  setUpdatedQuickPromptSettings: React.Dispatch<React.SetStateAction<QuickPrompt[]>>;
}

/**
 * Settings adding/removing quick prompts. Configure name, color, prompt and category.
 */
export const QuickPromptSettings: React.FC<Props> = React.memo<Props>(
  ({ quickPromptSettings, setUpdatedQuickPromptSettings }) => {
    const { basePromptContexts } = useAssistantContext();

    // Form options
    const [selectedQuickPrompt, setSelectedQuickPrompt] = useState<QuickPrompt>();
    // Prompt
    const [prompt, setPrompt] = useState('');
    const handlePromptTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(e.target.value);
    }, []);
    // Color
    const [color, setColor, errors] = useColorPickerState(DEFAULT_COLOR);
    const handleColorChange = useCallback<EuiSetColorMethod>(
      (text, { hex, isValid }) => {
        if (selectedQuickPrompt != null) {
          setSelectedQuickPrompt({
            ...selectedQuickPrompt,
            color: text,
          });
        }
        setColor(text, { hex, isValid });
      },
      [selectedQuickPrompt, setColor]
    );
    // Prompt Contexts/Categories
    const [selectedPromptContexts, setSelectedPromptContexts] = useState<PromptContextTemplate[]>(
      []
    );
    const onPromptContextSelectionChange = useCallback((pc: PromptContextTemplate[]) => {
      setSelectedPromptContexts(pc);
    }, []);

    // When top level quick prompt selection changes
    const onQuickPromptSelectionChange = useCallback(
      (quickPrompt?: QuickPrompt | string) => {
        const newQuickPrompt: QuickPrompt | undefined =
          typeof quickPrompt === 'string'
            ? {
                title: quickPrompt ?? '',
                prompt: '',
                color: DEFAULT_COLOR,
                categories: [],
              }
            : quickPrompt;

        setSelectedQuickPrompt(newQuickPrompt);
        setPrompt(newQuickPrompt?.prompt ?? '');
        setColor(newQuickPrompt?.color ?? DEFAULT_COLOR, {
          hex: newQuickPrompt?.color ?? DEFAULT_COLOR,
          isValid: true,
        });
        // Map back to PromptContextTemplate's from QuickPrompt.categories
        setSelectedPromptContexts(
          basePromptContexts.filter((bpc) =>
            newQuickPrompt?.categories?.some((cat) => bpc?.category === cat)
          ) ?? []
        );
      },
      [basePromptContexts, setColor]
    );

    const onQuickPromptDeleted = useCallback(
      (title: string) => {
        setUpdatedQuickPromptSettings((prev) => prev.filter((qp) => qp.title !== title));
      },
      [setUpdatedQuickPromptSettings]
    );

    // useEffects
    // Update quick prompts on any field change since editing is in place
    useEffect(() => {
      if (selectedQuickPrompt != null) {
        setUpdatedQuickPromptSettings((prev) => {
          const alreadyExists = prev.some((qp) => qp.title === selectedQuickPrompt.title);
          if (alreadyExists) {
            return prev.map((qp) => {
              const categories = selectedPromptContexts.map((pc) => pc.category);
              if (qp.title === selectedQuickPrompt.title) {
                return {
                  ...qp,
                  color,
                  prompt,
                  categories,
                };
              }
              return qp;
            });
          } else {
            return [
              ...prev,
              {
                ...selectedQuickPrompt,
                color,
                prompt,
                categories: selectedPromptContexts.map((pc) => pc.category),
              },
            ];
          }
        });
      }
    }, [color, prompt, selectedPromptContexts, selectedQuickPrompt, setUpdatedQuickPromptSettings]);

    return (
      <>
        <EuiTitle size={'s'}>
          <h2>{i18n.SETTINGS_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size={'s'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>
        <EuiHorizontalRule margin={'s'} />

        <EuiFormRow label={i18n.QUICK_PROMPT_NAME} display="rowCompressed" fullWidth>
          <QuickPromptSelector
            onQuickPromptDeleted={onQuickPromptDeleted}
            onQuickPromptSelectionChange={onQuickPromptSelectionChange}
            quickPrompts={quickPromptSettings}
            selectedQuickPrompt={selectedQuickPrompt}
          />
        </EuiFormRow>

        <EuiFormRow label={i18n.QUICK_PROMPT_PROMPT} display="rowCompressed" fullWidth>
          <EuiTextArea
            onChange={handlePromptTextChange}
            value={prompt}
            compressed
            fullWidth
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
            onPromptContextSelectionChange={onPromptContextSelectionChange}
            promptContexts={basePromptContexts}
            selectedPromptContexts={selectedPromptContexts}
          />
        </EuiFormRow>

        <EuiFormRow
          display="rowCompressed"
          label={i18n.QUICK_PROMPT_BADGE_COLOR}
          isInvalid={!!errors}
          error={errors}
        >
          <EuiColorPicker
            compressed
            onChange={handleColorChange}
            color={color}
            isInvalid={!!errors}
          />
        </EuiFormRow>
      </>
    );
  }
);

QuickPromptSettings.displayName = 'AddQuickPromptModal';
