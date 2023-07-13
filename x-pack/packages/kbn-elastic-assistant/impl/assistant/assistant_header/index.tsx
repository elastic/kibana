/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { DocLinksStart } from '@kbn/core-doc-links-browser';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/gen_ai/constants';
import { Conversation } from '../../..';
import { AssistantTitle } from '../assistant_title';
import { ConversationSelector } from '../conversations/conversation_selector';
import { AssistantSettingsButton } from '../settings/assistant_settings_button';
import * as i18n from '../translations';

interface OwnProps {
  currentConversation: Conversation;
  isDisabled: boolean;
  defaultConnectorId?: string;
  defaultProvider?: OpenAiProviderType;
  currentTitle: { title: string | JSX.Element; titleIcon: string };
  docLinks: Omit<DocLinksStart, 'links'>;
  selectedConversationId: string;
  onToggleShowAnonymizedValues: (e: EuiSwitchEvent) => void;
  setSelectedConversationId: (e: string) => void;
  shouldDisableKeyboardShortcut: () => void;
  showAnonymizedValues: boolean;
}

type Props = OwnProps;

export const AssistantHeader: FunctionComponent<Props> = ({
  currentConversation,
  currentTitle,
  defaultConnectorId,
  defaultProvider,
  docLinks,
  isDisabled,
  onToggleShowAnonymizedValues,
  selectedConversationId,
  setSelectedConversationId,
  shouldDisableKeyboardShortcut,
  showAnonymizedValues,
}) => {
  return (
    <>
      <EuiFlexGroup
        css={css`
          width: 100%;
        `}
        alignItems={'center'}
        justifyContent={'spaceBetween'}
      >
        <EuiFlexItem grow={false}>
          <AssistantTitle currentTitle={currentTitle} docLinks={docLinks} />
        </EuiFlexItem>

        <EuiFlexItem
          grow={false}
          css={css`
            width: 335px;
          `}
        >
          <ConversationSelector
            defaultConnectorId={defaultConnectorId}
            defaultProvider={defaultProvider}
            selectedConversationId={selectedConversationId}
            setSelectedConversationId={setSelectedConversationId}
            shouldDisableKeyboardShortcut={shouldDisableKeyboardShortcut}
            isDisabled={isDisabled}
          />

          <>
            <EuiSpacer size={'s'} />
            <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.SHOW_ANONYMIZED_TOOLTIP}
                  position="left"
                  repositionOnScroll={true}
                >
                  <EuiSwitch
                    checked={
                      currentConversation.replacements != null &&
                      Object.keys(currentConversation.replacements).length > 0 &&
                      showAnonymizedValues
                    }
                    compressed={true}
                    disabled={currentConversation.replacements == null}
                    label={i18n.SHOW_ANONYMIZED}
                    onChange={onToggleShowAnonymizedValues}
                  />
                </EuiToolTip>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <AssistantSettingsButton
                  isDisabled={isDisabled}
                  selectedConversation={currentConversation}
                  setSelectedConversationId={setSelectedConversationId}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin={'m'} />
    </>
  );
};
