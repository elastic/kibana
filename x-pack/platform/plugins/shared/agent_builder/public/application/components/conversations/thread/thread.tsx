/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { AgentDefinition, VersionedAttachment } from '@kbn/agent-builder-common';
import { UserMessage } from './items/user_message';
import { PromptResponse } from './items/prompt_response';
import { AgentTurn } from './agent_turn';
import type { ThreadItem } from './to_thread_items';

interface ThreadProps {
  items: ThreadItem[];
  agent?: AgentDefinition | null;
  conversationAttachments?: VersionedAttachment[];
}

export const Thread: React.FC<ThreadProps> = ({ items, agent, conversationAttachments }) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {items.map((item) => {
        let content: React.ReactNode;
        switch (item.kind) {
          case 'userMessage':
            content = (
              <UserMessage
                event={item.event}
                isPending={item.isPending}
                conversationAttachments={conversationAttachments}
              />
            );
            break;
          case 'promptResponse':
            content = <PromptResponse event={item.event} />;
            break;
          case 'agentTurn':
            content = <AgentTurn item={item} agent={agent} />;
            break;
          default:
            content = null;
        }
        return (
          <EuiFlexItem key={item.key} grow={false}>
            {content}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
