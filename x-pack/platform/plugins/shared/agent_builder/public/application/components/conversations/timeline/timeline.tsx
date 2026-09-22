/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import moment from 'moment';
import type { AgentDefinition, VersionedAttachment } from '@kbn/agent-builder-common';
import { UserMessageEvent } from './items/user_message_event';
import { AgentTurn } from './agent_turn';
import { ConversationDateDivider } from './conversation_date_divider';
import type { TimelineItem } from './types';

interface TimelineProps {
  items: TimelineItem[];
  agent?: AgentDefinition | null;
  conversationAttachments?: VersionedAttachment[];
  /** True while an answered prompt's resume is in flight; spins the last group's avatar. */
  isResuming?: boolean;
}

const itemDate = (item: TimelineItem): string =>
  item.kind === 'agentTurn' ? item.startedAt : item.event.created_at;

export const Timeline: React.FC<TimelineProps> = ({
  items,
  agent,
  conversationAttachments,
  isResuming = false,
}) => {
  const startsNewDateGroup = (index: number): boolean => {
    const previous = items[index - 1];
    return !previous || !moment(itemDate(items[index])).isSame(moment(itemDate(previous)), 'day');
  };

  // After user resumed, make the previous turn to show the loader
  const isGroupLoading = (start: number): boolean => {
    let index = start;
    let running = false;
    while (index < items.length) {
      const entry = items[index];
      if (entry.kind !== 'agentTurn') {
        return running;
      }
      if (index > start && startsNewDateGroup(index)) {
        return running;
      }
      running = running || entry.status === 'running';
      index++;
    }
    return running || isResuming;
  };

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="l">
        {items.map((item, index) => {
          const previous = items[index - 1];
          const showDivider = startsNewDateGroup(index);
          const showHeader =
            showDivider || !(item.kind === 'agentTurn' && previous?.kind === 'agentTurn');
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
                  conversationAttachments={conversationAttachments}
                  showHeader={showHeader}
                  isGroupLoading={showHeader ? isGroupLoading(index) : false}
                />
              );
              break;
            default:
              content = null;
          }
          return (
            <React.Fragment key={item.key}>
              {showDivider && <ConversationDateDivider date={itemDate(item)} />}
              <EuiFlexItem grow={false} data-timeline-item-key={item.key}>
                {content}
              </EuiFlexItem>
            </React.Fragment>
          );
        })}
      </EuiFlexGroup>
      {/* Spacing after the last item so its text is not cut off by the scroll mask */}
      <EuiSpacer size="l" />
    </>
  );
};
