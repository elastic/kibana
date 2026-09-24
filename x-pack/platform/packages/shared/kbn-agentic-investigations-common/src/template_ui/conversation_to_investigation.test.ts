/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, TimelineEvent } from '@kbn/agent-builder-common';
import { EventActorType, TimelineEventType, TimelineTriggerType } from '@kbn/agent-builder-common';
import {
  conversationToInvestigation,
  conversationToEscalationHeader,
} from './conversation_to_investigation';

const conversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conversation-1',
  agent_id: 'elastic-ai-agent',
  user: { username: 'test' },
  title: 'Impossible travel — exec account',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  rounds: [],
  template_id: 'investigation',
  ...overrides,
});

const actor = { type: EventActorType.user, id: 'u1', full_name: 'M. Rodriguez' };

const event = (overrides: Partial<TimelineEvent>): TimelineEvent =>
  ({
    id: 'e1',
    created_at: '2024-01-01T01:00:00Z',
    actor,
    ...overrides,
  } as TimelineEvent);

/** The run stats every `execution_terminated` event carries, irrespective of how it ended. */
const runSummary = {
  model_usage: { connector_id: 'c1', llm_calls: 1, input_tokens: 10, output_tokens: 20 },
  time_to_first_token: 1,
  time_to_last_token: 2,
};

describe('conversationToInvestigation', () => {
  it('reads the identity and timestamps straight off the conversation', () => {
    const result = conversationToInvestigation(conversation());

    expect(result).toMatchObject({
      id: 'conversation-1',
      template_id: 'investigation',
      title: 'Impossible travel — exec account',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    });
  });

  it('maps the investigation template metadata fields', () => {
    const result = conversationToInvestigation(
      conversation({
        metadata: {
          status: 'open',
          severity: 'high',
          summary: 'A second sign-in replayed the same session cookie.',
          workflow_execution_id: 'exec-77',
        },
      })
    );

    expect(result.status).toBe('open');
    expect(result.severity).toBe('high');
    expect(result.summary).toBe('A second sign-in replayed the same session cookie.');
    expect(result.watch_execution_id).toBe('exec-77');
  });

  it('falls back to the single-line description when there is no summary', () => {
    const result = conversationToInvestigation(
      conversation({ metadata: { description: 'One line about the incident.' } })
    );

    expect(result.summary).toBe('One line about the incident.');
  });

  it('prefers the long summary over the description when both are set', () => {
    const result = conversationToInvestigation(
      conversation({ metadata: { summary: 'The long form.', description: 'The short form.' } })
    );

    expect(result.summary).toBe('The long form.');
  });

  it('takes the first assignee, because the header renders a single avatar', () => {
    const result = conversationToInvestigation(
      conversation({ metadata: { assignees: ['first.analyst', 'second.analyst'] } })
    );

    expect(result.assignee).toBe('first.analyst');
    // The full list is preserved so the interactive picker can show all assignees.
    expect(result.assignees).toEqual(['first.analyst', 'second.analyst']);
  });

  it('reports no assignee for an empty assignees list', () => {
    const result = conversationToInvestigation(conversation({ metadata: { assignees: [] } }));

    expect(result.assignee).toBeNull();
    expect(result.assignees).toEqual([]);
  });

  it('returns an empty assignees array when no metadata assignees field is present', () => {
    const result = conversationToInvestigation(conversation({ metadata: undefined }));

    expect(result.assignees).toEqual([]);
  });

  it('leaves optional fields undefined rather than inventing them', () => {
    const result = conversationToInvestigation(conversation({ metadata: undefined }));

    expect(result.status).toBeUndefined();
    expect(result.severity).toBeUndefined();
    expect(result.summary).toBeUndefined();
    expect(result.assignee).toBeNull();
    // No metadata field declares a watch, so this stays empty rather than guessing one.
    expect(result.watch_id).toBe('');
    expect(result.watch_execution_id).toBe('');
    // Proposal-queue concepts a conversation cannot answer.
    expect(result.affectedSurface).toBeUndefined();
    expect(result.recommendedAction).toBeUndefined();
    expect(result.priorityScore).toBeUndefined();
  });

  it('has no events for a conversation that carries none', () => {
    expect(conversationToInvestigation(conversation({ events: undefined })).events).toEqual([]);
  });

  describe('timeline events', () => {
    it("summarizes a user message with the message itself and names the actor's display name", () => {
      const result = conversationToInvestigation(
        conversation({
          events: [
            event({
              type: TimelineEventType.userMessage,
              data: { message: 'Why did this alert fire?' },
            }),
          ],
        })
      );

      expect(result.events).toEqual([
        {
          id: 'e1',
          timestamp: '2024-01-01T01:00:00Z',
          type: TimelineEventType.userMessage,
          summary: 'Why did this alert fire?',
          actor: 'M. Rodriguez',
        },
      ]);
    });

    it('drops execution steps, which would bury the timeline under one row per tool call', () => {
      const result = conversationToInvestigation(
        conversation({
          events: [
            event({
              id: 'step',
              type: TimelineEventType.executionStep,
              data: { step: { type: 'reasoning', reasoning: 'thinking' }, sequence: 1 },
            } as Partial<TimelineEvent>),
            event({
              id: 'kept',
              type: TimelineEventType.executionStarted,
              data: { trigger_type: TimelineTriggerType.userMessage },
            }),
          ],
        })
      );

      expect(result.events.map(({ id }) => id)).toEqual(['kept']);
    });

    it('names what triggered an agent run', () => {
      const result = conversationToInvestigation(
        conversation({
          events: [
            event({
              type: TimelineEventType.executionStarted,
              data: { trigger_type: TimelineTriggerType.schedule },
            }),
          ],
        })
      );

      expect(result.events[0].summary).toBe('Agent run started (schedule)');
    });

    it("uses the agent's answer as the summary of a run that responded", () => {
      const result = conversationToInvestigation(
        conversation({
          events: [
            event({
              type: TimelineEventType.executionTerminated,
              data: {
                outcome: { type: 'responded', response: { message: 'Session was replayed.' } },
                ...runSummary,
              },
            }),
          ],
        })
      );

      expect(result.events[0].summary).toBe('Session was replayed.');
    });

    it('reports a run that paused to ask the analyst', () => {
      const result = conversationToInvestigation(
        conversation({
          events: [
            event({
              type: TimelineEventType.executionTerminated,
              data: { outcome: { type: 'prompt_requested', prompts: [] }, ...runSummary },
            }),
          ],
        })
      );

      expect(result.events[0].summary).toBe('Agent asked for input');
    });

    it('carries the failure reason so a failed run is not silently blank', () => {
      const result = conversationToInvestigation(
        conversation({
          events: [
            event({
              type: TimelineEventType.executionFailed,
              data: { error: { code: 'internalError', message: 'rule_not_found' } },
            } as Partial<TimelineEvent>),
          ],
        })
      );

      expect(result.events[0].summary).toBe('Agent run failed: rule_not_found');
    });

    it('names the attachment type on an attachment event', () => {
      const result = conversationToInvestigation(
        conversation({
          events: [
            event({
              type: TimelineEventType.attachmentAdded,
              data: {
                attachment_id: 'a1',
                attachment_type: 'platform.proposal',
                current_version: 1,
                render_inline: false,
                source: 'workflow',
              },
            }),
          ],
        })
      );

      expect(result.events[0].summary).toBe('Added a platform.proposal attachment');
    });

    it('falls back to the username when the actor has no display name', () => {
      const result = conversationToInvestigation(
        conversation({
          events: [
            event({
              type: TimelineEventType.userMessage,
              data: { message: 'hello' },
              actor: { type: EventActorType.user, id: 'u1', username: 'm.rodriguez' },
            }),
          ],
        })
      );

      expect(result.events[0].actor).toBe('m.rodriguez');
    });

    it('drops an event type registered by another solution', () => {
      const result = conversationToInvestigation(
        conversation({
          events: [
            {
              id: 'custom',
              created_at: '2024-01-01T01:00:00Z',
              actor,
              type: 'text_note',
              data: {},
            },
            event({ id: 'builtin', type: TimelineEventType.userMessage, data: { message: 'hi' } }),
          ],
        })
      );

      // `events` is an open envelope, so only the built-in types have a payload this can read.
      expect(result.events.map(({ id }) => id)).toEqual(['builtin']);
    });

    it('drops an event whose payload yields nothing worth a line of text', () => {
      const result = conversationToInvestigation(
        conversation({
          events: [event({ type: TimelineEventType.userMessage, data: { message: '' } })],
        })
      );

      expect(result.events).toEqual([]);
    });
  });
});

describe('conversationToEscalationHeader', () => {
  it('defaults to "open" when metadata is absent (matches server behaviour)', () => {
    const result = conversationToEscalationHeader(conversation());
    expect(result.status).toBe('open');
    expect(result.assigneeUids).toEqual([]);
  });

  it('reads the status string from metadata', () => {
    const result = conversationToEscalationHeader(conversation({ metadata: { status: 'closed' } }));
    expect(result.status).toBe('closed');
  });

  it('defaults to "open" for an empty string status', () => {
    const result = conversationToEscalationHeader(conversation({ metadata: { status: '' } }));
    expect(result.status).toBe('open');
  });

  it('reads assignee uids from the assignees array', () => {
    const result = conversationToEscalationHeader(
      conversation({ metadata: { assignees: ['uid-1', 'uid-2'] } })
    );
    expect(result.assigneeUids).toEqual(['uid-1', 'uid-2']);
  });

  it('drops non-string entries from the assignees array', () => {
    const result = conversationToEscalationHeader(
      // Cast to bypass strict typing: the runtime value can be any MetadataFieldValue.
      conversation({
        metadata: {
          assignees: ['uid-1', 42 as unknown as string, null as unknown as string, 'uid-2'],
        },
      })
    );
    expect(result.assigneeUids).toEqual(['uid-1', 'uid-2']);
  });

  it('returns empty assigneeUids when assignees is not an array', () => {
    const result = conversationToEscalationHeader(
      conversation({ metadata: { assignees: 'uid-single' } })
    );
    expect(result.assigneeUids).toEqual([]);
  });
});
