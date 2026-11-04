/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiHorizontalRule,
  EuiIcon,
  EuiInlineEditText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import {
  AGENT_BUILDER_UI_EBT,
  isPrivatelySharedConversation,
  isPublicConversation,
  normalizeConversationAccessControl,
  type Conversation,
  type ConversationAccessControl,
} from '@kbn/agent-builder-common';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { getEbtProps } from '@kbn/ebt-click';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useConversationPermissions } from '../../../hooks/use_conversation';
import { useConversationFlyoutSessionProps } from '../../../hooks/use_conversation_flyout_session_props';
import {
  DEFAULT_CONVERSATION_ICON,
  useConversationTemplateDisplay,
} from '../../../hooks/use_conversation_template_display';
import { useToasts } from '../../../hooks/use_toasts';
import { labels } from './conversation_metadata_i18n';

const FLYOUT_WIDTH = 500;

const getVisibilityLabel = (accessControl: ConversationAccessControl | undefined): string => {
  if (isPublicConversation(accessControl)) {
    return labels.public;
  }

  return isPrivatelySharedConversation(accessControl) ? labels.restricted : labels.private;
};

const getRenameEbtProps = (action: string) =>
  getEbtProps({
    element: AGENT_BUILDER_UI_EBT.element.pageContent,
    action,
    detail: 'conversation',
  });

interface MetadataRowProps {
  label: string;
  children: React.ReactNode;
}

const MetadataRow: React.FC<MetadataRowProps> = ({ label, children }) => (
  <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
    <EuiFlexItem grow={1}>
      <EuiText size="xs" color="subdued">
        {label}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={4}>{children}</EuiFlexItem>
  </EuiFlexGroup>
);

// Formatted with moment, like the timeline, so it follows the `dateFormat:tz` advanced setting.
const MetadataDate: React.FC<{ value: string }> = ({ value }) => (
  <EuiText size="s">{moment(value).locale(i18n.getLocale()).format('lll')}</EuiText>
);

interface ConversationMetadataFlyoutProps {
  conversation: Conversation;
  onClose: () => void;
}

export const ConversationMetadataFlyout: React.FC<ConversationMetadataFlyoutProps> = ({
  conversation,
  onClose,
}) => {
  const flyoutSessionProps = useConversationFlyoutSessionProps(labels.flyoutTitle);
  const { rename: canRename } = useConversationPermissions();
  const { conversationActions } = useConversationContext();
  const { addErrorToast } = useToasts();
  const templateDisplay = useConversationTemplateDisplay();
  const [isTitleInvalid, setIsTitleInvalid] = useState(false);
  const [draftTitle, setDraftTitle] = useState(conversation.title);

  useEffect(() => {
    setDraftTitle(conversation.title);
  }, [conversation.title]);

  const accessControl = normalizeConversationAccessControl(conversation.access_control);
  const isPublic = isPublicConversation(conversation.access_control);

  const onTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraftTitle(event.target.value);
  };

  const onSaveTitle = async (value: string): Promise<boolean> => {
    const nextTitle = value.trim();

    if (!nextTitle) {
      setIsTitleInvalid(true);
      return false;
    }

    setIsTitleInvalid(false);
    setDraftTitle(nextTitle);

    if (nextTitle === conversation.title) {
      return true;
    }

    try {
      await conversationActions.renameConversation(conversation.id, nextTitle);
      return true;
    } catch (error) {
      addErrorToast({ title: labels.renameError, text: formatAgentBuilderErrorMessage(error) });
      return false;
    }
  };

  const rows = [
    {
      label: labels.title,
      value: (
        <EuiInlineEditText
          size="s"
          value={draftTitle}
          onChange={onTitleChange}
          inputAriaLabel={labels.titleInput}
          isReadOnly={!canRename}
          isInvalid={isTitleInvalid}
          onSave={onSaveTitle}
          // EUI's previous value doesn't follow title changes made elsewhere, so reset to the saved title.
          onCancel={() => {
            setIsTitleInvalid(false);
            setDraftTitle(conversation.title);
          }}
          // An `xs` button keeps the title row as tall as the text rows; EuiText keeps the text at `s`.
          readModeProps={{
            size: 'xs',
            'data-test-subj': 'agentBuilderConversationMetadataTitle',
            ...getRenameEbtProps(AGENT_BUILDER_UI_EBT.action.conversation.RENAME),
          }}
          editModeProps={{
            inputProps: { 'data-test-subj': 'agentBuilderConversationMetadataTitleInput' },
            saveButtonProps: {
              'data-test-subj': 'agentBuilderConversationMetadataTitleSave',
              ...getRenameEbtProps(AGENT_BUILDER_UI_EBT.action.conversation.RENAME_SAVE),
            },
            cancelButtonProps: {
              'data-test-subj': 'agentBuilderConversationMetadataTitleCancel',
              ...getRenameEbtProps(AGENT_BUILDER_UI_EBT.action.conversation.RENAME_CANCEL),
            },
          }}
        />
      ),
    },
    {
      label: labels.author,
      value: <EuiText size="s">{conversation.user.username}</EuiText>,
    },
    { label: labels.created, value: <MetadataDate value={conversation.created_at} /> },
    { label: labels.lastEdited, value: <MetadataDate value={conversation.updated_at} /> },
    {
      label: labels.visibility,
      value: <EuiText size="s">{getVisibilityLabel(conversation.access_control)}</EuiText>,
    },
    // Public chats have no member list, so a count would be misleading.
    ...(isPublic
      ? []
      : [
          {
            label: labels.members,
            value: <EuiText size="s">{accessControl.entries.length + 1}</EuiText>,
          },
        ]),
    {
      label: labels.type,
      value: (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon
              type={templateDisplay?.icon || DEFAULT_CONVERSATION_ICON}
              size="s"
              aria-hidden={true}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{templateDisplay?.name || labels.defaultType}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  return (
    <EuiFlyout
      type="push"
      size={FLYOUT_WIDTH}
      ownFocus={false}
      onClose={onClose}
      closeButtonProps={{ 'aria-label': labels.close }}
      flyoutMenuDisplayMode="always"
      role="region"
      aria-label={labels.flyoutTitle}
      data-test-subj="agentBuilderConversationMetadataFlyout"
      {...flyoutSessionProps}
    >
      <EuiFlyoutBody>
        <EuiTitle size="s">
          <h3>{labels.flyoutTitle}</h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        {rows.map(({ label, value }, index) => (
          <React.Fragment key={label}>
            {index > 0 ? <EuiHorizontalRule margin="xs" /> : null}
            <MetadataRow label={label}>{value}</MetadataRow>
          </React.Fragment>
        ))}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
