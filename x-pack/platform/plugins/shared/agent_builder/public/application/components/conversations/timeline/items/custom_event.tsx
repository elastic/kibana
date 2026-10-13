/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getConversationRoundAuthorDisplayName } from '@kbn/agent-builder-common';
import { useConversationId } from '../../../../context/conversation/use_conversation_id';
import { AuthorHeader } from '../author_header';
import { TimelineRenderErrorBoundary } from '../timeline_render_error_boundary';
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

interface CustomEventRowProps {
  item: CustomEventItem;
  conversationId: string;
  isStreaming: boolean;
}

/** The icon and header draw only when the definition's `getHeader` returns data. */
const CustomEventRow = ({ item, conversationId, isStreaming }: CustomEventRowProps) => {
  const { euiTheme } = useEuiTheme();
  const { definition, event } = item;
  const ctx = { conversationId, isStreaming };
  const header = definition.getHeader?.(event, ctx);
  const content = definition.render(event, ctx);

  const avatarColumnStyles = css`
    min-inline-size: ${euiTheme.size.l};
  `;

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="flexStart"
      responsive={false}
      data-test-subj="agentBuilderTimelineCustomEvent"
    >
      <EuiFlexItem
        grow={false}
        css={avatarColumnStyles}
        data-test-subj="agentBuilderTimelineCustomEventAvatar"
      >
        {header && <EuiIcon type={header.icon} size="l" aria-label={header.iconTitle} />}
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <EuiFlexGroup direction="column" gutterSize="s">
          {header && (
            <EuiFlexItem grow={false}>
              <AuthorHeader
                name={getConversationRoundAuthorDisplayName(event.actor)}
                label={header.label}
                startedAt={event.created_at}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>{content}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * A custom event drawn by its registered UI definition. The first column keeps it aligned with
 * turn content. `getHeader` and `render` run inside one error boundary.
 */
export const CustomEvent = ({ item, isStreaming = false }: CustomEventProps) => {
  const conversationId = useConversationId();

  // Guaranteed by the conversation route; the check only narrows the type.
  if (!conversationId) {
    return null;
  }

  return (
    <TimelineRenderErrorBoundary title={labels.renderError}>
      {() => (
        <CustomEventRow item={item} conversationId={conversationId} isStreaming={isStreaming} />
      )}
    </TimelineRenderErrorBoundary>
  );
};
