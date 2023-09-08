/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiPopover, EuiButtonEmpty } from '@elastic/eui';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';

import { QuickPrompt } from '../../..';
import * as i18n from './translations';
import { useAssistantContext } from '../../assistant_context';
import { QUICK_PROMPTS_TAB } from '../settings/assistant_settings';

const QuickPromptsFlexGroup = styled(EuiFlexGroup)`
  margin: 16px;
`;

const COUNT_BEFORE_OVERFLOW = 5;
interface QuickPromptsProps {
  setInput: (input: string) => void;
  setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  trackPrompt: (prompt: string) => void;
}

/**
 * Component displaying a horizontal list of quick prompts, with callback for retrieving the selected quick prompt
 * text, and support for adding new quick prompts and editing existing. Also supports overflow of quick prompts,
 * and localstorage for storing new and edited prompts.
 */
export const QuickPrompts: React.FC<QuickPromptsProps> = React.memo(
  ({ setInput, setIsSettingsModalVisible, trackPrompt }) => {
    const { allQuickPrompts, promptContexts, setSelectedSettingsTab } = useAssistantContext();

    const contextFilteredQuickPrompts = useMemo(() => {
      const registeredPromptContextTitles = Object.values(promptContexts).map((pc) => pc.category);
      return allQuickPrompts.filter((quickPrompt) => {
        // Return quick prompt as match if it has no categories, otherwise ensure category exists in registered prompt contexts
        if (quickPrompt.categories == null || quickPrompt.categories.length === 0) {
          return true;
        } else {
          return quickPrompt.categories.some((category) => {
            return registeredPromptContextTitles.includes(category);
          });
        }
      });
    }, [allQuickPrompts, promptContexts]);

    // Overflow state
    const [isOverflowPopoverOpen, setIsOverflowPopoverOpen] = useState(false);
    const toggleOverflowPopover = useCallback(
      () => setIsOverflowPopoverOpen(!isOverflowPopoverOpen),
      [isOverflowPopoverOpen]
    );
    const closeOverflowPopover = useCallback(() => setIsOverflowPopoverOpen(false), []);

    const onClickAddQuickPrompt = useCallback(
      (badge: QuickPrompt) => {
        setInput(badge.prompt);
        if (badge.isDefault) {
          trackPrompt(badge.title);
        } else {
          trackPrompt('Custom');
        }
      },
      [setInput, trackPrompt]
    );

    const onClickOverflowQuickPrompt = useCallback(
      (badge: QuickPrompt) => {
        onClickAddQuickPrompt(badge);
        closeOverflowPopover();
      },
      [closeOverflowPopover, onClickAddQuickPrompt]
    );

    const showQuickPromptSettings = useCallback(() => {
      setIsSettingsModalVisible(true);
      setSelectedSettingsTab(QUICK_PROMPTS_TAB);
    }, [setIsSettingsModalVisible, setSelectedSettingsTab]);

    return (
      <QuickPromptsFlexGroup gutterSize="s" alignItems="center">
        {contextFilteredQuickPrompts.slice(0, COUNT_BEFORE_OVERFLOW).map((badge, index) => (
          <EuiFlexItem key={index} grow={false}>
            <EuiBadge
              color={badge.color}
              onClick={() => onClickAddQuickPrompt(badge)}
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
                      onClick={() => onClickOverflowQuickPrompt(badge)}
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
          <EuiButtonEmpty
            data-test-subj="addQuickPrompt"
            onClick={showQuickPromptSettings}
            iconType="plus"
            size="xs"
          >
            {i18n.ADD_QUICK_PROMPT}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </QuickPromptsFlexGroup>
    );
  }
);
QuickPrompts.displayName = 'QuickPrompts';
