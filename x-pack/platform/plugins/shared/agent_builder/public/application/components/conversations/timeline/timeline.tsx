/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { UserTurn } from './items/user_turn';
import { PromptResponse } from './items/prompt_response';
import { ExecutionTerminated } from './items/execution_terminated';
import { ExecutionFailed } from './items/execution_failed';
import { ExecutionAborted } from './items/execution_aborted';
import { ActiveExecution } from './active_execution';
import { AgentTurn } from './agent_turn';
import { RoundEvents } from '../conversation_rounds/round_events/round_events';
import type { TimelineItem } from './group_timeline_events';

interface TimelineProps {
  items: TimelineItem[];
}

const renderItem = (item: TimelineItem): React.ReactNode => {
  switch (item.kind) {
    case 'userMessage':
      return <UserTurn event={item.event} isPending={item.isPending} />;

    case 'promptResponse':
      return <PromptResponse event={item.event} />;

    case 'agentTurn':
      return (
        <AgentTurn startedAt={item.startedAt} origin={item.origin}>
          <ExecutionTerminated event={item.terminal} steps={item.steps} />
        </AgentTurn>
      );

    case 'agentFailed':
      return (
        <AgentTurn startedAt={item.startedAt} origin={item.origin}>
          <ExecutionFailed event={item.terminal} />
        </AgentTurn>
      );

    case 'agentAborted':
      return (
        <AgentTurn startedAt={item.startedAt} origin={item.origin}>
          <ExecutionAborted event={item.terminal} />
        </AgentTurn>
      );

    case 'agentRunning':
      return (
        <AgentTurn startedAt={item.startedAt} origin={item.origin} isLoading>
          {item.steps.length > 0 ? <RoundEvents steps={item.steps} /> : null}
        </AgentTurn>
      );

    case 'agentActive':
      return (
        <AgentTurn startedAt={item.startedAt} isLoading>
          <ActiveExecution activeExecution={item.draft} />
        </AgentTurn>
      );

    default:
      return null;
  }
};

export const Timeline: React.FC<TimelineProps> = ({ items }) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {items.map((item) => (
        <EuiFlexItem key={item.key} grow={false}>
          {renderItem(item)}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
