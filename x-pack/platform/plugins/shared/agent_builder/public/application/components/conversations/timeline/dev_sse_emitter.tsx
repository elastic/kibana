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
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { ChatEvent } from '@kbn/agent-builder-common';
import {
  ChatEventType,
  ToolResultType,
  TimelineEventType,
  EventActorType,
  TimelineTriggerType,
} from '@kbn/agent-builder-common';

// Storybook-only harness that fakes the SSE stream so the active-execution reducer can be driven by
// hand. Each button emits one `ChatEvent`; the deck groups them by phase and offers a single "Next"
// that walks the happy path. Lives here permanently for the Timeline stories - not shipped in the app.

// A button that adds an item over the (faked) HTTP API, e.g. an attachment or a custom event. These
// land in the same timeline as the streamed events, so they sit in the deck alongside them.
export interface AddItemButton {
  id: string;
  label: string;
  onClick: () => void;
}

interface DevSseEmitterProps {
  emit: (event: ChatEvent) => void;
  reset: () => void;
  addItemButtons: AddItemButton[];
}

const MESSAGE_ID = 'dev-message';
const TOOL_CALL_ID = 'dev-tool-call';

// The assistant message is streamed one part at a time by the message_chunk button, so each press
// adds the next slice. The seal (message_complete / execution_terminated) fills in the whole message.
const MESSAGE_PARTS = [
  'You have ',
  '4 standalone indices ',
  'and 2 data streams. ',
  'Everything looks healthy.',
];
const FULL_MESSAGE = MESSAGE_PARTS.join('');

const buildMessageChunk = (text: string): ChatEvent => ({
  type: ChatEventType.messageChunk,
  data: { message_id: MESSAGE_ID, text_chunk: text },
});
// Must parse as a round-derived execution id, so the fold can derive step and terminal ids.
const DEV_ROUND_ID = 'dev-round';
const DEV_EXECUTION_ID = `${DEV_ROUND_ID}::execution`;

type Phase = 'Init' | 'Reasoning' | 'Tool' | 'Message' | 'Seal';

interface EventButton {
  id: string;
  label: string;
  phase: Phase;
  build: () => ChatEvent;
}

const BUTTONS: EventButton[] = [
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
    // Overridden in the click handler to stream successive parts; this is only the fallback.
    build: () => buildMessageChunk(MESSAGE_PARTS[0]),
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
      data: { message_id: MESSAGE_ID, message_content: FULL_MESSAGE },
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
          response: { message: FULL_MESSAGE },
        },
      },
    }),
  },
];

const PHASES: Phase[] = ['Init', 'Reasoning', 'Tool', 'Message', 'Seal'];

// A realistic run, in order, for the "Next" button to walk through.
const HAPPY_PATH: string[] = [
  'execution-started',
  'tool-call',
  'tool-progress',
  'tool-result',
  'reasoning',
  'message-chunk',
  'message-chunk',
  'message-chunk',
  'message-chunk',
  'thinking-complete',
  'message-complete',
  'execution-terminated',
];

const byId = (id: string) => BUTTONS.find((button) => button.id === id);

// One labeled row of the deck: a fixed-width label on the left, wrapping buttons on the right.
const DeckRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false} css={{ minInlineSize: 72 }}>
      <EuiText size="xs" color="subdued">
        {label}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
        {children}
      </EuiFlexGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiText size="xs" color="subdued">
    <strong>{children}</strong>
  </EuiText>
);

export const DevSseEmitter: React.FC<DevSseEmitterProps> = ({ emit, reset, addItemButtons }) => {
  const [nextIndex, setNextIndex] = useState(0);
  const [chunkIndex, setChunkIndex] = useState(0);

  const chunksExhausted = chunkIndex >= MESSAGE_PARTS.length;

  const emitButton = (button: EventButton) => {
    // Stream the message one part at a time instead of re-emitting the same chunk.
    if (button.id === 'message-chunk') {
      if (chunksExhausted) return;
      emit(buildMessageChunk(MESSAGE_PARTS[chunkIndex]));
      setChunkIndex((index) => index + 1);
      return;
    }
    emit(button.build());
  };

  const emitNext = () => {
    const button = byId(HAPPY_PATH[nextIndex]);
    if (!button) return;
    emitButton(button);
    setNextIndex((index) => index + 1);
  };

  const handleReset = () => {
    setNextIndex(0);
    setChunkIndex(0);
    reset();
  };

  const isDone = nextIndex >= HAPPY_PATH.length;

  // The "Add" row (attachments / custom events) sits just above Seal, since those items land in the
  // timeline before the run is sealed.
  const eventRows = [
    ...PHASES.filter((phase) => phase !== 'Seal').map((phase) => ({
      key: phase,
      label: phase,
      buttons: BUTTONS.filter((button) => button.phase === phase).map((button) => (
        <EuiFlexItem grow={false} key={button.id}>
          <EuiButton
            size="s"
            color="text"
            isDisabled={button.id === 'message-chunk' && chunksExhausted}
            onClick={() => emitButton(button)}
          >
            {button.label}
          </EuiButton>
        </EuiFlexItem>
      )),
    })),
    {
      key: 'Add',
      label: 'Add',
      buttons: addItemButtons.map((button) => (
        <EuiFlexItem grow={false} key={button.id}>
          <EuiButton size="s" color="text" onClick={button.onClick}>
            {button.label}
          </EuiButton>
        </EuiFlexItem>
      )),
    },
    ...PHASES.filter((phase) => phase === 'Seal').map((phase) => ({
      key: phase,
      label: phase,
      buttons: BUTTONS.filter((button) => button.phase === phase).map((button) => (
        <EuiFlexItem grow={false} key={button.id}>
          <EuiButton size="s" color="text" onClick={() => emitButton(button)}>
            {button.label}
          </EuiButton>
        </EuiFlexItem>
      )),
    })),
  ];

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiTitle size="xxs">
        <h3>Event deck</h3>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" fill iconType="play" onClick={emitNext} isDisabled={isDone}>
            {`Next (${Math.min(nextIndex + 1, HAPPY_PATH.length)}/${HAPPY_PATH.length})`}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" color="danger" iconType="refresh" onClick={handleReset}>
            Reset
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <SectionLabel>Events</SectionLabel>
      <EuiSpacer size="xs" />
      <EuiPanel color="subdued" hasShadow={false} paddingSize="s">
        {eventRows.map((row, index) => (
          <React.Fragment key={row.key}>
            {index > 0 && <EuiHorizontalRule margin="xs" />}
            <DeckRow label={row.label}>{row.buttons}</DeckRow>
          </React.Fragment>
        ))}
      </EuiPanel>
    </EuiPanel>
  );
};
