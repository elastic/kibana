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
import { useConversationStream } from '../../../../hooks/use_conversation_stream';

export interface PromptRequestEventProps {
  prompts: PromptRequest[];
  /** The `execution_terminated` event the answer joins back to. */
  pauseEventId?: string;
  /** The execution that paused; the resume becomes the next execution of its round. */
  pausedExecutionId?: string;
}

/** Renders the prompts a paused run is waiting on, and resumes it once all of them are answered. */
export const PromptRequestEvent: React.FC<PromptRequestEventProps> = ({
  prompts,
  pauseEventId,
  pausedExecutionId,
}) => {
  const { resumeRound, isResuming } = useConversationStream();
  const [answers, setAnswers] = useState<Record<string, PromptResponse>>({});

  const canResume = Boolean(pauseEventId && pausedExecutionId);
  const isDisabled = !canResume || isResuming;

  const handleAnswer = useCallback(
    (promptId: string, response: PromptResponse) => {
      const nextAnswers = { ...answers, [promptId]: response };
      setAnswers(nextAnswers);

      const isEveryPromptAnswered = prompts.every((prompt) => nextAnswers[prompt.id] !== undefined);
      if (isEveryPromptAnswered && pauseEventId && pausedExecutionId) {
        resumeRound({
          prompts: nextAnswers,
          promptRequestedEventId: pauseEventId,
          pausedExecutionId,
        });
      }
    },
    [answers, prompts, pauseEventId, pausedExecutionId, resumeRound]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="agentBuilderPromptRequest">
      {prompts.map((prompt) => {
        const answer = answers[prompt.id];
        const isAnswered = answer !== undefined;

        switch (prompt.type) {
          case AgentPromptType.confirmation:
            return (
              <EuiFlexItem grow={false} key={prompt.id}>
                <ConfirmationPrompt
                  prompt={prompt}
                  onConfirm={() => handleAnswer(prompt.id, { allow: true })}
                  onCancel={() => handleAnswer(prompt.id, { allow: false })}
                  isLoading={isResuming}
                  isDisabled={isDisabled}
                  isAnswered={isAnswered}
                  answeredValue={answer && 'allow' in answer ? answer.allow : undefined}
                />
              </EuiFlexItem>
            );
          case AgentPromptType.authorization:
            return (
              <EuiFlexItem grow={false} key={prompt.id}>
                <AuthorizationPrompt
                  prompt={prompt}
                  onAuthorize={() => handleAnswer(prompt.id, { authorized: true })}
                  onCancel={() => handleAnswer(prompt.id, { authorized: false })}
                  isLoading={isResuming}
                  isDisabled={isDisabled}
                  isAnswered={isAnswered}
                  answeredValue={answer && 'authorized' in answer ? answer.authorized : undefined}
                />
              </EuiFlexItem>
            );
          case AgentPromptType.ask_user_question:
            return (
              <EuiFlexItem grow={false} key={prompt.id}>
                <AskUserQuestionPrompt
                  promptId={prompt.id}
                  questions={prompt.questions}
                  onSubmit={(response) => handleAnswer(prompt.id, response)}
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
