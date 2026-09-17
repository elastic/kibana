/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PromptResponseEvent as PromptResponseEventData } from '@kbn/agent-builder-common';
import type { PromptRequest, PromptResponse } from '@kbn/agent-builder-common/agents';
import {
  isConfirmationPromptResponse,
  isAuthorizationPromptResponse,
  isConfirmationPrompt,
  isAuthorizationPrompt,
} from '@kbn/agent-builder-common/agents';
import { AuthorizationPrompt, ConfirmationPrompt } from '../../conversation_rounds/round_prompt';

const labels = {
  approved: i18n.translate('xpack.agentBuilder.conversation.timeline.promptResponse.approved', {
    defaultMessage: 'Approved',
  }),
  denied: i18n.translate('xpack.agentBuilder.conversation.timeline.promptResponse.denied', {
    defaultMessage: 'Denied',
  }),
  authorized: i18n.translate('xpack.agentBuilder.conversation.timeline.promptResponse.authorized', {
    defaultMessage: 'Authorized',
  }),
  declined: i18n.translate('xpack.agentBuilder.conversation.timeline.promptResponse.declined', {
    defaultMessage: 'Declined',
  }),
};

const noop = () => {};

const StatusBadge: React.FC<{ isPositive: boolean; positive: string; negative: string }> = ({
  isPositive,
  positive,
  negative,
}) => (
  <div>
    <EuiBadge color={isPositive ? 'success' : 'danger'}>
      {isPositive ? positive : negative}
    </EuiBadge>
  </div>
);

export const PromptResponseEvent: React.FC<{
  event: PromptResponseEventData;
  prompts?: PromptRequest[];
}> = ({ event, prompts }) => {
  const promptsById = new Map<string, PromptRequest>(
    (prompts ?? []).map((prompt) => [prompt.id, prompt])
  );

  const approvalEntries = Object.entries(event.data.responses).filter(
    ([, response]) =>
      isConfirmationPromptResponse(response) || isAuthorizationPromptResponse(response)
  );

  if (approvalEntries.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="agentBuilderPromptResponse">
      {approvalEntries.map(([promptId, response]) => (
        <EuiFlexItem key={promptId} grow={false}>
          {renderAnswer(promptId, response, promptsById.get(promptId))}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

const renderAnswer = (
  promptId: string,
  response: PromptResponse,
  definition: PromptRequest | undefined
): React.ReactNode => {
  if (isConfirmationPromptResponse(response)) {
    if (definition && isConfirmationPrompt(definition)) {
      return (
        <ConfirmationPrompt
          prompt={definition}
          onConfirm={noop}
          onCancel={noop}
          isDisabled
          isAnswered
          answeredValue={response.allow}
        />
      );
    }
    return (
      <StatusBadge
        isPositive={response.allow}
        positive={labels.approved}
        negative={labels.denied}
      />
    );
  }

  if (isAuthorizationPromptResponse(response)) {
    if (definition && isAuthorizationPrompt(definition)) {
      return (
        <AuthorizationPrompt
          prompt={definition}
          onAuthorize={noop}
          onCancel={noop}
          isDisabled
          isAnswered
          answeredValue={response.authorized}
        />
      );
    }
    return (
      <StatusBadge
        isPositive={response.authorized}
        positive={labels.authorized}
        negative={labels.declined}
      />
    );
  }

  return null;
};
