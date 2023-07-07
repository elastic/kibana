/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiIcon,
  EuiModal,
  EuiModalFooter,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiPage,
  EuiPageBody,
  EuiPageSidebar,
  EuiSplitPanel,
} from '@elastic/eui';

// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';
import { css } from '@emotion/react';
import { Conversation } from '../../..';
import * as i18n from './translations';
import { useAssistantContext } from '../../assistant_context';
import { AnonymizationSettings } from '../../data_anonymization/settings/anonymization_settings';
import { QuickPromptSettings } from '../quick_prompts/quick_prompt_settings/quick_prompt_settings';
import { SystemPromptSettings } from '../prompt_editor/system_prompt/system_prompt_modal/system_prompt_settings';
import { AdvancedSettings } from './advanced_settings/advanced_settings';
import { ConversationSettings } from '../conversations/conversation_settings/conversation_settings';

const StyledEuiModal = styled(EuiModal)`
  width: 800px;
  height: 575px;
`;

export const CONVERSATIONS_TAB = 'CONVERSATION_TAB' as const;
export const QUICK_PROMPTS_TAB = 'QUICK_PROMPTS_TAB' as const;
export const SYSTEM_PROMPTS_TAB = 'SYSTEM_PROMPTS_TAB' as const;
export const ANONYMIZATION_TAB = 'ANONYMIZATION_TAB' as const;
export const FUNCTIONS_TAB = 'FUNCTIONS_TAB' as const;
export const ADVANCED_TAB = 'ADVANCED_TAB' as const;

export type SettingsTabs =
  | typeof CONVERSATIONS_TAB
  | typeof QUICK_PROMPTS_TAB
  | typeof SYSTEM_PROMPTS_TAB
  | typeof ANONYMIZATION_TAB
  | typeof FUNCTIONS_TAB
  | typeof ADVANCED_TAB;
interface Props {
  onClose: (
    event?: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>
  ) => void;
  onSave: () => void;
  selectedConversation: Conversation;
  selectedTab?: SettingsTabs;
}

/**
 * Modal for overall Assistant Settings, including conversation settings, quick prompts, system prompts,
 * anonymization, functions (coming soon!), and advanced settings.
 */
export const AssistantSettings: React.FC<Props> = React.memo(
  ({ onClose, onSave, selectedConversation, selectedTab: defaultSelectedTab }) => {
    const { actionTypeRegistry, allSystemPrompts, http } = useAssistantContext();
    const [selectedTab, setSelectedTab] = useState<SettingsTabs>(
      defaultSelectedTab ?? CONVERSATIONS_TAB
    );

    return (
      <StyledEuiModal onClose={onClose}>
        <EuiPage paddingSize="none">
          <EuiPageSidebar
            paddingSize="xs"
            css={css`
              min-inline-size: unset !important;
              max-width: 104px;
            `}
          >
            <EuiKeyPadMenu>
              <EuiKeyPadMenuItem
                id={CONVERSATIONS_TAB}
                label={i18n.CONVERSATIONS_MENU_ITEM}
                isSelected={selectedTab === CONVERSATIONS_TAB}
                onClick={() => setSelectedTab(CONVERSATIONS_TAB)}
              >
                <>
                  <EuiIcon
                    type="editorComment"
                    size="xl"
                    css={css`
                      position: relative;
                      top: -10px;
                    `}
                  />
                  <EuiIcon
                    type="editorComment"
                    size="l"
                    css={css`
                      position: relative;
                      transform: rotateY(180deg);
                      top: -7px;
                    `}
                  />
                </>
              </EuiKeyPadMenuItem>
              <EuiKeyPadMenuItem
                id={QUICK_PROMPTS_TAB}
                label={i18n.QUICK_PROMPTS_MENU_ITEM}
                isSelected={selectedTab === QUICK_PROMPTS_TAB}
                onClick={() => setSelectedTab(QUICK_PROMPTS_TAB)}
              >
                <>
                  <EuiIcon type="editorComment" size="xxl" />
                  <EuiIcon
                    type="bolt"
                    size="s"
                    color="warning"
                    css={css`
                      position: absolute;
                      top: 11px;
                      left: 14px;
                    `}
                  />
                </>
              </EuiKeyPadMenuItem>
              <EuiKeyPadMenuItem
                id={SYSTEM_PROMPTS_TAB}
                label={i18n.SYSTEM_PROMPTS_MENU_ITEM}
                isSelected={selectedTab === SYSTEM_PROMPTS_TAB}
                onClick={() => setSelectedTab(SYSTEM_PROMPTS_TAB)}
              >
                <EuiIcon type="editorComment" size="xxl" />
                <EuiIcon
                  type="storage"
                  size="s"
                  color="success"
                  css={css`
                    position: absolute;
                    top: 11px;
                    left: 14px;
                  `}
                />
              </EuiKeyPadMenuItem>
              <EuiKeyPadMenuItem
                id={ANONYMIZATION_TAB}
                label={i18n.ANONYMIZATION_MENU_ITEM}
                isSelected={selectedTab === ANONYMIZATION_TAB}
                onClick={() => setSelectedTab(ANONYMIZATION_TAB)}
              >
                <EuiIcon type="eyeClosed" size="l" />
              </EuiKeyPadMenuItem>
              {/* TODO: Additional settings coming soon! */}
              {/* <EuiKeyPadMenuItem*/}
              {/*  id={FUNCTIONS_TAB}*/}
              {/*  label={i18n.FUNCTIONS_MENU_ITEM}*/}
              {/*  isSelected={selectedTab === FUNCTIONS_TAB}*/}
              {/*  isDisabled*/}
              {/*  onClick={() => setSelectedTab(FUNCTIONS_TAB)}*/}
              {/* >*/}
              {/*  <EuiIcon type="function" size="l" />*/}
              {/* </EuiKeyPadMenuItem>*/}
              {/* <EuiKeyPadMenuItem*/}
              {/*  id={ADVANCED_TAB}*/}
              {/*  label={i18n.ADVANCED_MENU_ITEM}*/}
              {/*  isSelected={selectedTab === ADVANCED_TAB}*/}
              {/*  onClick={() => setSelectedTab(ADVANCED_TAB)}*/}
              {/* >*/}
              {/*  <EuiIcon type="wrench" size="l" />*/}
              {/* </EuiKeyPadMenuItem>*/}
            </EuiKeyPadMenu>
          </EuiPageSidebar>
          <EuiPageBody paddingSize="none" panelled={true}>
            <EuiSplitPanel.Outer grow={true}>
              <EuiSplitPanel.Inner
                className="eui-scrollBar"
                grow={true}
                css={css`
                  max-height: 550px;
                  overflow-y: scroll;
                `}
              >
                {selectedTab === CONVERSATIONS_TAB && (
                  <ConversationSettings
                    allSystemPrompts={allSystemPrompts}
                    actionTypeRegistry={actionTypeRegistry}
                    conversation={selectedConversation}
                    http={http}
                  />
                )}
                {selectedTab === QUICK_PROMPTS_TAB && <QuickPromptSettings />}
                {selectedTab === SYSTEM_PROMPTS_TAB && (
                  <SystemPromptSettings onSystemPromptsChange={() => {}} />
                )}
                {selectedTab === ANONYMIZATION_TAB && <AnonymizationSettings pageSize={5} />}
                {selectedTab === FUNCTIONS_TAB && <></>}
                {selectedTab === ADVANCED_TAB && <AdvancedSettings />}
              </EuiSplitPanel.Inner>
              <EuiSplitPanel.Inner
                grow={false}
                color="subdued"
                css={css`
                  padding: 8px;
                `}
              >
                <EuiModalFooter
                  css={css`
                    padding: 4px;
                  `}
                >
                  <EuiButtonEmpty size="s" onClick={onClose}>
                    {i18n.CANCEL}
                  </EuiButtonEmpty>

                  <EuiButton size="s" type="submit" onClick={onSave} fill>
                    {i18n.SAVE}
                  </EuiButton>
                </EuiModalFooter>
              </EuiSplitPanel.Inner>
            </EuiSplitPanel.Outer>
          </EuiPageBody>
        </EuiPage>
      </StyledEuiModal>
    );
  }
);

AssistantSettings.displayName = 'AssistantSettings';
