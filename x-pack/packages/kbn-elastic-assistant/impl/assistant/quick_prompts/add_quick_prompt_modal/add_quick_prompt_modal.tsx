/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiColorPicker,
  useColorPickerState,
  EuiTextArea,
} from '@elastic/eui';

// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';

import { EuiSetColorMethod } from '@elastic/eui/src/services/color_picker/color_picker';
import { PromptContextTemplate } from '../../../..';
import * as i18n from './translations';
import { QuickPrompt } from '../types';
import { QuickPromptSelector } from '../quick_prompt_selector/quick_prompt_selector';
import { PromptContextSelector } from '../prompt_context_selector/prompt_context_selector';

const StyledEuiModal = styled(EuiModal)``;

const DEFAULT_COLOR = '#D36086';

interface Props {
  promptContexts: PromptContextTemplate[];
  quickPrompts: QuickPrompt[];
  onQuickPromptsChange: (quickPrompts: QuickPrompt[]) => void;
}

/**
 * Modal for adding/removing quick prompts. Configure name, color, prompt and category.
 */
export const AddQuickPromptModal: React.FC<Props> = React.memo(
  ({ promptContexts, quickPrompts, onQuickPromptsChange }) => {
    const [isModalVisible, setIsModalVisible] = useState(false);

    // Local state for quick prompts (returned to parent on save via onQuickPromptsChange())
    const [updatedQuickPrompts, setUpdatedQuickPrompts] = useState<QuickPrompt[]>(quickPrompts);

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
          promptContexts.filter((bpc) =>
            newQuickPrompt?.categories?.some((cat) => bpc?.category === cat)
          ) ?? []
        );
      },
      [promptContexts, setColor]
    );

    const onQuickPromptDeleted = useCallback((title: string) => {
      setUpdatedQuickPrompts((prev) => prev.filter((qp) => qp.title !== title));
    }, []);

    // Modal control functions
    const cleanupAndCloseModal = useCallback(() => {
      setIsModalVisible(false);
    }, []);

    const handleCloseModal = useCallback(() => {
      cleanupAndCloseModal();
    }, [cleanupAndCloseModal]);

    const handleSave = useCallback(() => {
      onQuickPromptsChange(updatedQuickPrompts);
      cleanupAndCloseModal();
    }, [cleanupAndCloseModal, onQuickPromptsChange, updatedQuickPrompts]);

    // useEffects
    // Update quick prompts on any field change since editing is in place
    useEffect(() => {
      if (selectedQuickPrompt != null) {
        setUpdatedQuickPrompts((prev) => {
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
    }, [color, prompt, selectedPromptContexts, selectedQuickPrompt]);

    // Reset local state on modal open
    useEffect(() => {
      if (isModalVisible) {
        setUpdatedQuickPrompts(quickPrompts);
      }
    }, [isModalVisible, quickPrompts]);

    return (
      <>
        <EuiButtonEmpty onClick={() => setIsModalVisible(true)} iconType="plus" size="xs">
          {i18n.ADD_QUICK_PROMPT}
        </EuiButtonEmpty>
        {isModalVisible && (
          <StyledEuiModal onClose={handleCloseModal} initialFocus=".quickPromptSelector">
            <EuiModalHeader>
              <EuiModalHeaderTitle>{i18n.ADD_QUICK_PROMPT_MODAL_TITLE}</EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              <EuiFormRow label={i18n.QUICK_PROMPT_NAME}>
                <QuickPromptSelector
                  onQuickPromptDeleted={onQuickPromptDeleted}
                  onQuickPromptSelectionChange={onQuickPromptSelectionChange}
                  quickPrompts={updatedQuickPrompts}
                  selectedQuickPrompt={selectedQuickPrompt}
                />
              </EuiFormRow>

              <EuiFormRow label={i18n.QUICK_PROMPT_PROMPT} fullWidth>
                <EuiTextArea onChange={handlePromptTextChange} value={prompt} />
              </EuiFormRow>

              <EuiFormRow label={i18n.QUICK_PROMPT_BADGE_COLOR} isInvalid={!!errors} error={errors}>
                <EuiColorPicker onChange={handleColorChange} color={color} isInvalid={!!errors} />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.QUICK_PROMPT_CATEGORIES}
                helpText={i18n.QUICK_PROMPT_CATEGORIES_HELP_TEXT}
              >
                <PromptContextSelector
                  onPromptContextSelectionChange={onPromptContextSelectionChange}
                  promptContexts={promptContexts}
                  selectedPromptContexts={selectedPromptContexts}
                />
              </EuiFormRow>
            </EuiModalBody>

            <EuiModalFooter>
              <EuiButtonEmpty onClick={handleCloseModal}>{i18n.CANCEL}</EuiButtonEmpty>

              <EuiButton type="submit" onClick={handleSave} fill>
                {i18n.SAVE}
              </EuiButton>
            </EuiModalFooter>
          </StyledEuiModal>
        )}
      </>
    );
  }
);

AddQuickPromptModal.displayName = 'AddQuickPromptModal';
