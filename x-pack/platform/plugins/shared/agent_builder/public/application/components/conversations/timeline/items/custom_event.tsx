/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useConversationId } from '../../../../context/conversation/use_conversation_id';
import { AttachmentRenderErrorBoundary } from '../response/attachments/attachment_render_error_boundary';
import type { CustomEventItem } from '../types';

const labels = {
  renderError: i18n.translate('xpack.agentBuilder.timeline.customEvent.renderErrorTitle', {
    defaultMessage: "Couldn't render this event",
  }),
};

interface CustomEventProps {
  item: CustomEventItem;
  isStreaming?: boolean;
}

/**
 * A custom event drawn by its registered UI definition. The empty first column keeps it aligned
 * with turn content.
 */
export const CustomEvent = ({ item, isStreaming = false }: CustomEventProps) => {
  const { euiTheme } = useEuiTheme();
  const conversationId = useConversationId();

  const avatarColumnStyles = css`
    min-inline-size: ${euiTheme.size.l};
  `;

  // Guaranteed by the conversation route; the check only narrows the type.
  if (!conversationId) {
    return null;
  }

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="flexStart"
      responsive={false}
      data-test-subj="agentBuilderTimelineCustomEvent"
    >
      <EuiFlexItem grow={false} css={avatarColumnStyles} />
      <EuiFlexItem grow={true}>
        <AttachmentRenderErrorBoundary title={labels.renderError}>
          {() => item.definition.render(item.event, { conversationId, isStreaming })}
        </AttachmentRenderErrorBoundary>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
