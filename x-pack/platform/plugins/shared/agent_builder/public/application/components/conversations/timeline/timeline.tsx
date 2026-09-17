/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { AgentDefinition, VersionedAttachment } from '@kbn/agent-builder-common';
import { UserMessageEvent } from './items/user_message_event';
import type { PromptResumeProps } from './agent_turn';
import { AgentTurn } from './agent_turn';
import type { TimelineItem } from './to_timeline_items';

interface TimelineProps extends PromptResumeProps {
  items: TimelineItem[];
  agent?: AgentDefinition | null;
  conversationAttachments?: VersionedAttachment[];
}

export const Timeline: React.FC<TimelineProps> = ({
  items,
  agent,
  conversationAttachments,
  onResumePrompt,
  isResuming,
  isPromptDisabled,
}) => {
  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="l">
        {items.map((item) => {
          let content: React.ReactNode;
          switch (item.kind) {
            case 'userMessage':
              content = (
                <UserMessageEvent
                  event={item.event}
                  isPending={item.isPending}
                  conversationAttachments={conversationAttachments}
                />
              );
              break;
            case 'agentTurn':
              content = (
                <AgentTurn
                  item={item}
                  agent={agent}
                  onResumePrompt={onResumePrompt}
                  isResuming={isResuming}
                  isPromptDisabled={isPromptDisabled}
                />
              );
              break;
            default:
              content = null;
          }
          return (
            <EuiFlexItem key={item.key} grow={false} data-timeline-item-key={item.key}>
              {content}
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
      {/* Spacing after the last item so its text is not cut off by the scroll mask */}
      <EuiSpacer size="l" />
    </>
  );
};
