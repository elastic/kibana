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
  EuiBadge,
  EuiPopover,
  EuiButtonIcon,
  EuiButtonEmpty,
} from '@elastic/eui';
import { useMeasure } from 'react-use';

import { css } from '@emotion/react';
import {
  PromptResponse,
  PromptTypeEnum,
} from '@kbn/elastic-assistant-common/impl/schemas/prompts/bulk_crud_prompts_route.gen';
import * as i18n from './translations';
import { useAssistantContext } from '../../assistant_context';
import { QUICK_PROMPTS_TAB } from '../settings/const';

export const KNOWLEDGE_BASE_CATEGORY = 'knowledge-base';

interface QuickPromptsProps {
  setInput: (input: string) => void;
  setIsSettingsModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  trackPrompt: (prompt: string) => void;
  allPrompts: PromptResponse[];
}

/**
 * Component displaying a horizontal list of quick prompts, with callback for retrieving the selected quick prompt
 * text, and support for adding new quick prompts and editing existing. Also supports overflow of quick prompts,
 * and localstorage for storing new and edited prompts.
 */
export const QuickPrompts: React.FC<QuickPromptsProps> = React.memo(
  ({ setInput, setIsSettingsModalVisible, trackPrompt, allPrompts }) => {
    const [quickPromptsContainerRef, { width }] = useMeasure();

    const { promptContexts, setSelectedSettingsTab } = useAssistantContext();

    const contextFilteredQuickPrompts = useMemo(() => {
      const registeredPromptContextTitles = Object.values(promptContexts).map((pc) => pc.category);
      // include KNOWLEDGE_BASE_CATEGORY so KB dependent quick prompts are shown
      registeredPromptContextTitles.push(KNOWLEDGE_BASE_CATEGORY);

      return allPrompts.filter((prompt) => {
        // only quick prompts
        if (prompt.promptType !== PromptTypeEnum.quick) {
          return false;
        }
        // Return quick prompt as match if it has no categories, otherwise ensure category exists in registered prompt contexts
        if (!prompt.categories || prompt.categories.length === 0) {
          return true;
        } else {
          return prompt.categories?.some((category) => {
            return registeredPromptContextTitles.includes(category);
          });
        }
      });
    }, [allPrompts, promptContexts]);

    // Overflow state
    const [isOverflowPopoverOpen, setIsOverflowPopoverOpen] = useState(false);
    const toggleOverflowPopover = useCallback(
      () => setIsOverflowPopoverOpen(!isOverflowPopoverOpen),
      [isOverflowPopoverOpen]
    );
    const closeOverflowPopover = useCallback(() => setIsOverflowPopoverOpen(false), []);

    const onClickAddQuickPrompt = useCallback(
      (badge: PromptResponse) => {
        setInput(badge.content);
        if (badge.isDefault) {
          trackPrompt(badge.name);
        } else {
          trackPrompt('Custom');
        }
      },
      [setInput, trackPrompt]
    );

    const onClickOverflowQuickPrompt = useCallback(
      (badge: PromptResponse) => {
        onClickAddQuickPrompt(badge);
        closeOverflowPopover();
      },
      [closeOverflowPopover, onClickAddQuickPrompt]
    );

    const showQuickPromptSettings = useCallback(() => {
      setIsSettingsModalVisible(true);
      setSelectedSettingsTab(QUICK_PROMPTS_TAB);
    }, [setIsSettingsModalVisible, setSelectedSettingsTab]);

    const quickPrompts = useMemo(() => {
      const visibleCount = Math.floor(width / 120);
      const visibleItems = contextFilteredQuickPrompts.slice(0, visibleCount);
      const overflowItems = contextFilteredQuickPrompts.slice(visibleCount);

      return { visible: visibleItems, overflow: overflowItems };
    }, [contextFilteredQuickPrompts, width]);

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent={'spaceBetween'}>
        <EuiFlexItem
          css={css`
            overflow: hidden;
          `}
        >
          <EuiFlexGroup
            ref={quickPromptsContainerRef}
            gutterSize="s"
            alignItems="center"
            wrap={false}
          >
            {quickPrompts.visible.map((badge, index) => (
              <EuiFlexItem
                grow={false}
                key={index}
                css={css`
                  overflow: hidden;
                `}
              >
                <EuiBadge
                  color={badge.color}
                  onClick={() => onClickAddQuickPrompt(badge)}
                  onClickAriaLabel={badge.name}
                >
                  {badge.name}
                </EuiBadge>
              </EuiFlexItem>
            ))}
            {quickPrompts.overflow.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiPopover
                  button={
                    <EuiButtonIcon
                      color={'primary'}
                      iconType={'boxesHorizontal'}
                      onClick={toggleOverflowPopover}
                      aria-label={i18n.QUICK_PROMPT_OVERFLOW_ARIA}
                    />
                  }
                  isOpen={isOverflowPopoverOpen}
                  closePopover={closeOverflowPopover}
                  anchorPosition="rightUp"
                >
                  <EuiFlexGroup direction="column" gutterSize="s">
                    {quickPrompts.overflow.map((badge, index) => (
                      <EuiFlexItem key={index} grow={false}>
                        <EuiBadge
                          color={badge.color}
                          onClick={() => onClickOverflowQuickPrompt(badge)}
                          onClickAriaLabel={badge.name}
                        >
                          {badge.name}
                        </EuiBadge>
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                </EuiPopover>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
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
      </EuiFlexGroup>
    );
  }
);
QuickPrompts.displayName = 'QuickPrompts';
