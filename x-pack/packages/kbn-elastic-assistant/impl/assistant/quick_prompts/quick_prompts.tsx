/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiPopover } from '@elastic/eui';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';

import { useLocalStorage } from 'react-use';
import { QuickPrompt } from '../../..';
import * as i18n from './translations';
import { AddQuickPromptModal } from './add_quick_prompt_modal/add_quick_prompt_modal';
import { useAssistantContext } from '../../assistant_context';

const QuickPromptsFlexGroup = styled(EuiFlexGroup)`
  margin: 16px;
`;

export const QUICK_PROMPT_LOCAL_STORAGE_KEY = 'quickPrompts';

const COUNT_BEFORE_OVERFLOW = 5;
interface QuickPromptsProps {
  setInput: (input: string) => void;
}

/**
 * Component displaying a horizontal list of quick prompts, with callback for retrieving the selected quick prompt
 * text, and support for adding new quick prompts and editing existing. Also supports overflow of quick prompts,
 * and localstorage for storing new and edited prompts.
 */
export const QuickPrompts: React.FC<QuickPromptsProps> = React.memo(({ setInput }) => {
  const { basePromptContexts, baseQuickPrompts, nameSpace, promptContexts } = useAssistantContext();

  // Local storage for all quick prompts, prefixed by assistant nameSpace
  const [localStorageQuickPrompts, setLocalStorageQuickPrompts] = useLocalStorage(
    `${nameSpace}.${QUICK_PROMPT_LOCAL_STORAGE_KEY}`,
    baseQuickPrompts
  );
  const [quickPrompts, setQuickPrompts] = useState(localStorageQuickPrompts ?? []);

  const contextFilteredQuickPrompts = useMemo(() => {
    const registeredPromptContextTitles = Object.values(promptContexts).map((pc) => pc.category);
    return quickPrompts.filter((quickPrompt) => {
      // Return quick prompt as match if it has no categories, otherwise ensure category exists in registered prompt contexts
      if (quickPrompt.categories == null || quickPrompt.categories.length === 0) {
        return true;
      } else {
        return quickPrompt.categories.some((category) => {
          return registeredPromptContextTitles.includes(category);
        });
      }
    });
  }, [quickPrompts, promptContexts]);

  // Overflow state
  const [isOverflowPopoverOpen, setIsOverflowPopoverOpen] = useState(false);
  const toggleOverflowPopover = useCallback(
    () => setIsOverflowPopoverOpen(!isOverflowPopoverOpen),
    [isOverflowPopoverOpen]
  );
  const closeOverflowPopover = useCallback(() => setIsOverflowPopoverOpen(false), []);

  const onClickOverflowQuickPrompt = useCallback(
    (prompt: string) => {
      setInput(prompt);
      closeOverflowPopover();
    },
    [closeOverflowPopover, setInput]
  );
  // Callback for manage modal, saves to local storage on change
  const onQuickPromptsChange = useCallback(
    (newQuickPrompts: QuickPrompt[]) => {
      setLocalStorageQuickPrompts(newQuickPrompts);
      setQuickPrompts(newQuickPrompts);
    },
    [setLocalStorageQuickPrompts]
  );
  return (
    <QuickPromptsFlexGroup gutterSize="s" alignItems="center">
      {contextFilteredQuickPrompts.slice(0, COUNT_BEFORE_OVERFLOW).map((badge, index) => (
        <EuiFlexItem key={index} grow={false}>
          <EuiBadge
            color={badge.color}
            onClick={() => setInput(badge.prompt)}
            onClickAriaLabel={badge.title}
          >
            {badge.title}
          </EuiBadge>
        </EuiFlexItem>
      ))}
      {contextFilteredQuickPrompts.length > COUNT_BEFORE_OVERFLOW && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiBadge
                color={'hollow'}
                iconType={'boxesHorizontal'}
                onClick={toggleOverflowPopover}
                onClickAriaLabel={i18n.QUICK_PROMPT_OVERFLOW_ARIA}
              />
            }
            isOpen={isOverflowPopoverOpen}
            closePopover={closeOverflowPopover}
            anchorPosition="rightUp"
          >
            <EuiFlexGroup direction="column" gutterSize="s">
              {contextFilteredQuickPrompts.slice(COUNT_BEFORE_OVERFLOW).map((badge, index) => (
                <EuiFlexItem key={index} grow={false}>
                  <EuiBadge
                    color={badge.color}
                    onClick={() => onClickOverflowQuickPrompt(badge.prompt)}
                    onClickAriaLabel={badge.title}
                  >
                    {badge.title}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiPopover>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <AddQuickPromptModal
          promptContexts={basePromptContexts}
          quickPrompts={quickPrompts}
          onQuickPromptsChange={onQuickPromptsChange}
        />
      </EuiFlexItem>
    </QuickPromptsFlexGroup>
  );
});
QuickPrompts.displayName = 'QuickPrompts';
