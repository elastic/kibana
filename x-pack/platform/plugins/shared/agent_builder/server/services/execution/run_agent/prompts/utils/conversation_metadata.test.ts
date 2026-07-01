/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessedConversationMetadataContext } from '../../utils/prepare_conversation';
import {
  getConversationMetadataSection,
  getConversationMetadataSystemMessages,
} from './conversation_metadata';

const parsePayload = (section: string): Record<string, unknown> => {
  const match = section.match(/```json\n([\s\S]*)\n```/);
  if (!match) {
    throw new Error('Expected a JSON code block');
  }

  return JSON.parse(match[1]) as Record<string, unknown>;
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected an object');
  }

  return value as Record<string, unknown>;
};

describe('conversation metadata prompt context', () => {
  it('does not emit a metadata message when there is no structured metadata', () => {
    expect(
      getConversationMetadataSystemMessages({
        id: 'conversation-1',
        title: 'Regular chat',
      })
    ).toEqual([]);
  });

  it('formats investigation and incident metadata for the model prompt', () => {
    const timeline = Array.from({ length: 25 }, (_, index) => ({
      at: `2026-07-01T12:${String(index).padStart(2, '0')}:00.000Z`,
      actor: 'incident state agent',
      source: 'state update',
      summary: `Incident state update ${index}`,
      metadata: {
        service_name: 'checkout',
      },
    }));

    const metadata: ProcessedConversationMetadataContext = {
      id: 'incident-conversation-1',
      title: 'Checkout degradation',
      template_id: 'observability-incident-v1',
      template_snapshot: {
        template_id: 'observability-incident-v1',
        profile: 'incident',
        chat_mode: 'collaborative',
        captured_at: '2026-07-01T12:00:00.000Z',
        workflow_hooks: [
          {
            id: 'observability-incident-current-state',
            trigger: 'schedule',
            interval: '5m',
            workflow_name: 'Observability incident current state refresh',
            inline_workflow_yaml: 'steps:\n  - type: data.set',
          },
        ],
      },
      custom_fields: {
        severity: 'high',
        status: 'in progress',
        service_name: 'checkout',
        current_state: 'Checkout latency is elevated and error rate is rising.',
        outcome: 'Users are intermittently failing to complete checkout.',
        investigation_conversation_id: 'investigation-conversation-1',
        related_investigations: ['investigation-conversation-1'],
        timeline,
      },
    };

    const section = getConversationMetadataSection(metadata);
    expect(section).toBeDefined();
    if (!section) {
      throw new Error('Expected conversation metadata section');
    }
    expect(section).not.toContain('steps:\n  - type: data.set');

    const payload = parsePayload(section);
    const template = asRecord(payload.template);
    const templateHooks = asRecord(template.workflow_hooks);
    const templateHook = asRecord((templateHooks.hooks as unknown[])[0]);
    const customFields = asRecord(payload.custom_fields);
    const formattedTimeline = asRecord(customFields.timeline);

    expect(template.profile).toBe('incident');
    expect(templateHook.has_inline_workflow_yaml).toBe(true);
    expect(customFields.current_state).toBe(
      'Checkout latency is elevated and error rate is rising.'
    );
    expect(customFields.outcome).toBe('Users are intermittently failing to complete checkout.');
    expect(formattedTimeline.total_entries).toBe(25);
    expect(formattedTimeline.earliest_entries as unknown[]).toHaveLength(3);
    expect(formattedTimeline.latest_entries as unknown[]).toHaveLength(20);
  });
});
