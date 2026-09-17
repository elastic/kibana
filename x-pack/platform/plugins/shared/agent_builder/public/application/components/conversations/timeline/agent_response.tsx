/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type {
  AssistantResponse,
  ConversationRoundStep,
  ExecutionTerminatedEvent,
} from '@kbn/agent-builder-common';
import { RoundResponse } from '../conversation_rounds/round_response/round_response';
import { RoundEvents } from '../conversation_rounds/round_events/round_events';

interface AgentResponseProps {
  steps: ConversationRoundStep[];
  response: AssistantResponse;
  isLoading: boolean;
  /** The event that ended the execution; omitted while streaming, when the actions are hidden. */
  executionTerminatedEvent?: ExecutionTerminatedEvent;
}

/** The assistant's turn: shared presenter for both the finished run and the in-flight one. */
export const AgentResponse: React.FC<AgentResponseProps> = ({
  steps,
  response,
  isLoading,
  executionTerminatedEvent,
}) => (
  <EuiFlexGroup direction="column" gutterSize="s">
    {steps.length > 0 && (
      <EuiFlexItem grow={false}>
        <RoundEvents steps={steps} />
      </EuiFlexItem>
    )}
    <EuiFlexItem grow={false}>
      <RoundResponse
        response={response}
        steps={steps}
        isLoading={isLoading}
        hasError={false}
        executionTerminatedEvent={executionTerminatedEvent}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
