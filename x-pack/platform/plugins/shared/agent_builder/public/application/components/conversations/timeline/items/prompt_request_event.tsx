/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { PromptRequest, PromptResponse } from '@kbn/agent-builder-common/agents';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import {
  AskUserQuestionPrompt,
  AuthorizationPrompt,
  ConfirmationPrompt,
} from '../../conversation_rounds/round_prompt';

export interface PromptRequestEventProps {
  prompts: PromptRequest[];
  onResume: (params: { prompts: Record<string, PromptResponse> }) => void;
  isResuming?: boolean;
  isDisabled?: boolean;
}

export const PromptRequestEvent: React.FC<PromptRequestEventProps> = ({
  prompts,
  onResume,
  isResuming = false,
  isDisabled = false,
}) => {
  const [promptResponses, setPromptResponses] = useState<Record<string, PromptResponse>>({});

  const handlePromptResponse = useCallback(
    (promptId: string, promptResponse: PromptResponse) => {
      setPromptResponses((prev) => {
        const updated = { ...prev, [promptId]: promptResponse };
        const allAnswered = prompts.every((prompt) => updated[prompt.id] !== undefined);
        if (allAnswered) {
          onResume({ prompts: updated });
        }
        return updated;
      });
    },
    [prompts, onResume]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="agentBuilderPromptRequest">
      {prompts.map((prompt) => {
        const stored = promptResponses[prompt.id];
        switch (prompt.type) {
          case AgentPromptType.confirmation:
            return (
              <EuiFlexItem grow={false} key={prompt.id}>
                <ConfirmationPrompt
                  prompt={prompt}
                  onConfirm={() => handlePromptResponse(prompt.id, { allow: true })}
                  onCancel={() => handlePromptResponse(prompt.id, { allow: false })}
                  isLoading={isResuming}
                  isDisabled={isDisabled}
                  isAnswered={stored !== undefined}
                  answeredValue={stored && 'allow' in stored ? stored.allow : undefined}
                />
              </EuiFlexItem>
            );
          case AgentPromptType.authorization:
            return (
              <EuiFlexItem grow={false} key={prompt.id}>
                <AuthorizationPrompt
                  prompt={prompt}
                  onAuthorize={() => handlePromptResponse(prompt.id, { authorized: true })}
                  onCancel={() => handlePromptResponse(prompt.id, { authorized: false })}
                  isLoading={isResuming}
                  isDisabled={isDisabled}
                  isAnswered={stored !== undefined}
                  answeredValue={stored && 'authorized' in stored ? stored.authorized : undefined}
                />
              </EuiFlexItem>
            );
          case AgentPromptType.ask_user_question:
            return (
              <EuiFlexItem grow={false} key={prompt.id}>
                <AskUserQuestionPrompt
                  promptId={prompt.id}
                  questions={prompt.questions}
                  onSubmit={(response) => handlePromptResponse(prompt.id, response)}
                  isLoading={isResuming}
                  isDisabled={isDisabled}
                />
              </EuiFlexItem>
            );
        }
      })}
    </EuiFlexGroup>
  );
};
