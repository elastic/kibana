/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/css';
import {
  EuiAccordion,
  EuiComment,
  EuiErrorBoundary,
  EuiPanel,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { Message } from '@kbn/observability-ai-assistant-plugin/common';
import {
  ChatActionClickHandler,
  ChatItemControls,
  FailedToLoadResponse,
  Feedback,
  TelemetryEventTypeWithPayload,
} from '@kbn/observability-ai-assistant-plugin/public';
import { getRoleTranslation } from '../utils/get_role_translation';
import { ChatItemActions } from './chat_item_actions';
import { ChatItemAvatar } from './chat_item_avatar';
import { ChatItemContentInlinePromptEditor } from './chat_item_content_inline_prompt_editor';
import { ChatTimelineItem } from './chat_timeline';

export interface ChatItemProps extends Omit<ChatTimelineItem, 'message'> {
  onActionClick: ChatActionClickHandler;
  onEditSubmit: (message: Message) => void;
  onFeedbackClick: (feedback: Feedback) => void;
  onRegenerateClick: () => void;
  onSendTelemetry: (eventWithPayload: TelemetryEventTypeWithPayload) => void;
  onStopGeneratingClick: () => void;
}

const moreCompactHeaderClassName = css`
  .euiCommentEvent__header > .euiPanel {
    padding-top: 4px;
    padding-bottom: 4px;
  }
`;

const normalMessageClassName = css`
  ${moreCompactHeaderClassName}

  .euiCommentEvent__body {
    padding: 0;
  }

  /* targets .*euiTimelineItemEvent-top, makes sure text properly wraps and doesn't overflow */
  > :last-child {
    overflow-x: hidden;
  }
`;

const noPanelMessageClassName = css`
  .euiCommentEvent {
    border: none;
  }

  .euiCommentEvent__header {
    background: transparent;
    border-block-end: none;

    > .euiPanel {
      background: none;
    }
  }

  .euiCommentEvent__body {
    display: none;
  }
`;

export function ChatItem({
  actions: { canCopy, canEdit, canGiveFeedback, canRegenerate },
  content,
  function_call: functionCall,
  role,
  currentUser,
  display: { collapsed },
  element,
  error,
  loading,
  title,
  onActionClick,
  onEditSubmit,
  onFeedbackClick,
  onRegenerateClick,
  onSendTelemetry,
  onStopGeneratingClick,
}: ChatItemProps) {
  const accordionId = useGeneratedHtmlId({ prefix: 'chat' });

  const [editing, setEditing] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(Boolean(element));

  const actions = [canCopy, collapsed].filter(Boolean);

  const noBodyMessageClassName = css`
    ${moreCompactHeaderClassName}

    .euiCommentEvent__body {
      padding: 0;
      height: ${expanded ? 'fit-content' : '0px'};
      overflow: hidden;
      border: none;
    }
  `;

  const handleToggleExpand = () => {
    setExpanded(!expanded);

    if (editing) {
      setEditing(false);
    }
  };

  const handleToggleEdit = () => {
    if (collapsed && !expanded) {
      setExpanded(true);
    }
    setEditing(!editing);
  };

  const handleInlineEditSubmit = (newMessage: Message) => {
    handleToggleEdit();

    return onEditSubmit(newMessage);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(content || '');
  };

  let contentElement: React.ReactNode =
    content || loading || error ? (
      <ChatItemContentInlinePromptEditor
        editing={editing}
        loading={loading}
        functionCall={functionCall}
        content={content}
        role={role}
        onSubmit={handleInlineEditSubmit}
        onActionClick={onActionClick}
        onSendTelemetry={onSendTelemetry}
      />
    ) : null;

  if (collapsed) {
    contentElement = (
      <EuiAccordion
        id={accordionId}
        arrowDisplay="none"
        forceState={expanded ? 'open' : 'closed'}
        onToggle={handleToggleExpand}
      >
        {contentElement}
      </EuiAccordion>
    );
  }

  return (
    <EuiComment
      timelineAvatar={<ChatItemAvatar loading={loading} currentUser={currentUser} role={role} />}
      username={getRoleTranslation(role)}
      event={title}
      actions={
        <ChatItemActions
          canCopy={canCopy}
          canEdit={canEdit}
          collapsed={collapsed}
          editing={editing}
          expanded={expanded}
          onCopyToClipboard={handleCopyToClipboard}
          onToggleEdit={handleToggleEdit}
          onToggleExpand={handleToggleExpand}
        />
      }
      className={
        actions.length === 0 && !content && !element
          ? noPanelMessageClassName
          : collapsed
          ? noBodyMessageClassName
          : normalMessageClassName
      }
    >
      <EuiPanel hasShadow={false} paddingSize="s">
        {element ? <EuiErrorBoundary>{element}</EuiErrorBoundary> : null}
        {contentElement}
        {error ? <FailedToLoadResponse /> : null}
      </EuiPanel>

      <ChatItemControls
        canGiveFeedback={canGiveFeedback}
        canRegenerate={canRegenerate}
        error={error}
        loading={loading}
        onFeedbackClick={onFeedbackClick}
        onRegenerateClick={onRegenerateClick}
        onStopGeneratingClick={onStopGeneratingClick}
      />
    </EuiComment>
  );
}
