/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import type { ChatEvent, PromptResponseEvent } from '@kbn/agent-builder-common';
import {
  ChatEventType,
  ToolResultType,
  TimelineEventType,
  EventActorType,
  TimelineTriggerType,
} from '@kbn/agent-builder-common';
import { AgentPromptRequestSourceType, AgentPromptType } from '@kbn/agent-builder-common/agents';

// Storybook-only harness that fakes the SSE stream so the active-execution reducer can be driven by
// hand. Each button emits one `ChatEvent`; the deck groups them by phase and offers a single "Next"
// that walks the happy path. Lives here permanently for the Timeline stories - not shipped in the app.

interface DevSseEmitterProps {
  emit: (event: ChatEvent) => void;
  recordPromptResponse: (event: PromptResponseEvent) => void;
  reset: () => void;
}

const MESSAGE_ID = 'dev-message';
const TOOL_CALL_ID = 'dev-tool-call';
const DEV_EXECUTION_ID = 'dev-execution';
const PAUSE_EXECUTION_ID = 'dev-pause-execution';
const PAUSE_TERMINATED_ID = `${PAUSE_EXECUTION_ID}::execution_terminated`;
const CONFIRM_PROMPT_ID = 'dev-prompt-confirmation';
const AUTH_PROMPT_ID = 'dev-prompt-authorization';
const ASK_PROMPT_ID = 'dev-prompt-ask-user-question';

const DEV_QUESTIONS = [
  {
    question: 'Which environment should I look at?',
    options: [{ label: 'Production' }, { label: 'Staging' }, { label: 'Development' }],
    multi_select: false,
  },
];

type Phase = 'Init' | 'Reasoning' | 'Tool' | 'Message' | 'Seal' | 'HITL';

interface EventButton {
  id: string;
  label: string;
  phase: Phase;
  build: () => ChatEvent;
}

interface PromptResponseButton {
  id: string;
  label: string;
  phase: Phase;
  buildPromptResponse: () => PromptResponseEvent;
}

type DeckButton = EventButton | PromptResponseButton;

const BUTTONS: DeckButton[] = [
  {
    id: 'execution-started',
    label: 'execution_started',
    phase: 'Init',
    build: (): ChatEvent => ({
      type: TimelineEventType.executionStarted,
      id: `${DEV_EXECUTION_ID}::execution_started`,
      created_at: new Date().toISOString(),
      actor: { type: EventActorType.agent, id: 'dev-agent' },
      execution_id: DEV_EXECUTION_ID,
      data: { trigger_type: TimelineTriggerType.userMessage },
    }),
  },
  {
    id: 'reasoning',
    label: 'reasoning',
    phase: 'Reasoning',
    build: () => ({
      type: ChatEventType.reasoning,
      data: { reasoning: 'Looking at the last 15 minutes of host metrics.' },
    }),
  },
  {
    id: 'tool-call',
    label: 'tool_call',
    phase: 'Tool',
    build: () => ({
      type: ChatEventType.toolCall,
      data: {
        tool_call_id: TOOL_CALL_ID,
        tool_id: 'platform.core.search',
        params: { query: 'FROM metrics-* | LIMIT 5' },
      },
    }),
  },
  {
    id: 'tool-progress',
    label: 'tool_progress',
    phase: 'Tool',
    build: () => ({
      type: ChatEventType.toolProgress,
      data: { tool_call_id: TOOL_CALL_ID, message: 'Scanning 3 indices…' },
    }),
  },
  {
    id: 'tool-result',
    label: 'tool_result',
    phase: 'Tool',
    build: () => ({
      type: ChatEventType.toolResult,
      data: {
        tool_call_id: TOOL_CALL_ID,
        tool_id: 'platform.core.search',
        results: [{ tool_result_id: 'dev-result', type: ToolResultType.other, data: { hosts: 3 } }],
      },
    }),
  },
  {
    id: 'message-chunk',
    label: 'message_chunk',
    phase: 'Message',
    build: () => ({
      type: ChatEventType.messageChunk,
      data: { message_id: MESSAGE_ID, text_chunk: 'Hello ' },
    }),
  },
  {
    id: 'thinking-complete',
    label: 'thinking_complete',
    phase: 'Message',
    build: () => ({
      type: ChatEventType.thinkingComplete,
      data: { time_to_first_token: 2148 },
    }),
  },
  {
    id: 'message-complete',
    label: 'message_complete',
    phase: 'Message',
    build: () => ({
      type: ChatEventType.messageComplete,
      data: { message_id: MESSAGE_ID, message_content: 'Hello there, all hosts look healthy.' },
    }),
  },
  {
    id: 'execution-terminated',
    label: 'execution_terminated (seal)',
    phase: 'Seal',
    build: (): ChatEvent => ({
      type: TimelineEventType.executionTerminated,
      id: `${DEV_EXECUTION_ID}::execution_terminated`,
      created_at: new Date().toISOString(),
      actor: { type: EventActorType.agent, id: 'dev-agent' },
      execution_id: DEV_EXECUTION_ID,
      data: {
        model_usage: {
          connector_id: '',
          llm_calls: 1,
          input_tokens: 100,
          output_tokens: 50,
          model: 'dev',
        },
        time_to_first_token: 100,
        time_to_last_token: 500,
        outcome: {
          type: 'responded',
          response: { message: 'Hello there, all hosts look healthy.' },
        },
      },
    }),
  },
  {
    id: 'hitl-execution-started',
    label: 'execution_started (pause)',
    phase: 'HITL',
    build: (): ChatEvent => ({
      type: TimelineEventType.executionStarted,
      id: `${PAUSE_EXECUTION_ID}::execution_started`,
      created_at: new Date().toISOString(),
      actor: { type: EventActorType.agent, id: 'dev-agent' },
      execution_id: PAUSE_EXECUTION_ID,
      data: { trigger_type: TimelineTriggerType.userMessage },
    }),
  },
  {
    id: 'hitl-prompt-request-confirmation',
    label: 'prompt_request (confirmation)',
    phase: 'HITL',
    build: (): ChatEvent => ({
      type: ChatEventType.promptRequest,
      data: {
        prompt: {
          type: AgentPromptType.confirmation,
          id: CONFIRM_PROMPT_ID,
          title: 'Delete 3 indices?',
          message: 'The agent wants to delete `logs-2026.09.01` and 2 more.',
          color: 'warning',
        },
        source: { type: AgentPromptRequestSourceType.toolCall, tool_call_id: TOOL_CALL_ID },
      },
    }),
  },
  {
    id: 'hitl-prompt-request-authorization',
    label: 'prompt_request (authorization)',
    phase: 'HITL',
    build: (): ChatEvent => ({
      type: ChatEventType.promptRequest,
      data: {
        prompt: {
          type: AgentPromptType.authorization,
          id: AUTH_PROMPT_ID,
          connector_id: 'dev-connector',
          connector_name: 'GitHub',
          connector_type: '.github',
          auth_method: 'oauth_authorization_code',
        },
        source: { type: AgentPromptRequestSourceType.toolCall, tool_call_id: TOOL_CALL_ID },
      },
    }),
  },
  {
    id: 'hitl-prompt-request-ask',
    label: 'prompt_request (ask_user_question)',
    phase: 'HITL',
    build: (): ChatEvent => ({
      type: ChatEventType.promptRequest,
      data: {
        prompt: {
          type: AgentPromptType.ask_user_question,
          id: ASK_PROMPT_ID,
          questions: DEV_QUESTIONS,
        },
        source: { type: AgentPromptRequestSourceType.toolCall, tool_call_id: TOOL_CALL_ID },
      },
    }),
  },
  {
    id: 'hitl-execution-terminated',
    label: 'execution_terminated (pause)',
    phase: 'HITL',
    build: (): ChatEvent => ({
      type: TimelineEventType.executionTerminated,
      id: PAUSE_TERMINATED_ID,
      created_at: new Date().toISOString(),
      actor: { type: EventActorType.agent, id: 'dev-agent' },
      execution_id: PAUSE_EXECUTION_ID,
      data: {
        model_usage: {
          connector_id: '',
          llm_calls: 1,
          input_tokens: 80,
          output_tokens: 20,
          model: 'dev',
        },
        time_to_first_token: 100,
        time_to_last_token: 300,
        outcome: {
          type: 'prompt_requested',
          prompts: [
            {
              type: AgentPromptType.ask_user_question,
              id: ASK_PROMPT_ID,
              questions: DEV_QUESTIONS,
            },
          ],
        },
      },
    }),
  },
  {
    id: 'hitl-prompt-response',
    label: 'prompt_response (answer)',
    phase: 'HITL',
    buildPromptResponse: (): PromptResponseEvent => ({
      id: 'dev-prompt-response',
      type: TimelineEventType.promptResponse,
      created_at: new Date().toISOString(),
      actor: { type: EventActorType.user, id: 'dev-user' },
      data: {
        prompt_requested_event_id: PAUSE_TERMINATED_ID,
        responses: { [ASK_PROMPT_ID]: { answers: [{ choice: [0] }] } },
      },
    }),
  },
];

const PHASES: Phase[] = ['Init', 'Reasoning', 'Tool', 'Message', 'Seal', 'HITL'];

// Realistic runs, in order, for the "Next" button to walk through.
const HAPPY_PATH: string[] = [
  'execution-started',
  'tool-call',
  'tool-progress',
  'tool-result',
  'reasoning',
  'message-chunk',
  'message-chunk',
  'thinking-complete',
  'message-complete',
  'execution-terminated',
];

const HITL_PATH: string[] = [
  'hitl-execution-started',
  'tool-call',
  'tool-result',
  'hitl-prompt-request-ask',
  'hitl-user-question-asked',
  'hitl-execution-terminated',
  'hitl-prompt-response',
];

const PATHS = {
  happy: { label: 'Happy path', steps: HAPPY_PATH },
  hitl: { label: 'HITL pause', steps: HITL_PATH },
};

type PathName = keyof typeof PATHS;

const PATH_OPTIONS = Object.entries(PATHS).map(([id, { label }]) => ({ id, label }));

const byId = (id: string) => BUTTONS.find((button) => button.id === id);

export const DevSseEmitter: React.FC<DevSseEmitterProps> = ({
  emit,
  recordPromptResponse,
  reset,
}) => {
  const [nextIndex, setNextIndex] = useState(0);
  const [pathName, setPathName] = useState<PathName>('happy');
  const { steps } = PATHS[pathName];

  const press = (button: DeckButton) => {
    if ('buildPromptResponse' in button) {
      recordPromptResponse(button.buildPromptResponse());
      return;
    }
    emit(button.build());
  };

  const emitNext = () => {
    const button = byId(steps[nextIndex]);
    if (!button) return;
    press(button);
    setNextIndex((index) => index + 1);
  };

  const handleReset = () => {
    setNextIndex(0);
    reset();
  };

  const handlePathChange = (id: string) => {
    setPathName(id as PathName);
    setNextIndex(0);
    reset();
  };

  const isDone = nextIndex >= steps.length;

  return (
    <EuiPanel hasBorder paddingSize="m" color="subdued">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" fill iconType="play" onClick={emitNext} isDisabled={isDone}>
            {`Next (${Math.min(nextIndex + 1, steps.length)}/${steps.length})`}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend="Walkthrough"
            options={PATH_OPTIONS}
            idSelected={pathName}
            onChange={handlePathChange}
            buttonSize="s"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" color="danger" iconType="refresh" onClick={handleReset}>
            Reset
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="s" />

      <EuiFlexGroup direction="column" gutterSize="s">
        {PHASES.map((phase) => (
          <EuiFlexItem grow={false} key={phase}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false} css={{ minInlineSize: 72 }}>
                <EuiText size="xs" color="subdued">
                  {phase}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                  {BUTTONS.filter((button) => button.phase === phase).map((button) => (
                    <EuiFlexItem grow={false} key={button.id}>
                      <EuiButton size="s" color="text" onClick={() => press(button)}>
                        {button.label}
                      </EuiButton>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
