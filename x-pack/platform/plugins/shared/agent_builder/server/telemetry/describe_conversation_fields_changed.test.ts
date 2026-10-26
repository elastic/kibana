/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';
import {
  describeConversationFieldsChanged,
  UNRECOGNIZED_FIELD_VALUE,
  type ConversationFieldSnapshot,
} from './describe_conversation_fields_changed';

const investigation: ConversationTemplate = {
  id: 'investigation',
  version: 1,
  name: 'Investigation',
  fields: {
    status: { input_type: 'SELECT', options: ['open', 'closed'], report_changes: true },
    severity: { input_type: 'SELECT', options: ['low', 'high'] },
    close_reason: {
      input_type: 'SELECT',
      options: ['false_positive', 'benign', 'other'],
      report_changes: true,
    },
    verdict: { input_type: 'TEXT' },
  },
};

const escalation: ConversationTemplate = {
  id: 'escalation',
  version: 1,
  name: 'Escalation',
  fields: {
    status: { input_type: 'SELECT', options: ['open', 'closed'], report_changes: true },
  },
};

// Registration rejects this shape; it is built here only to prove the describer never sends it.
const freeText: ConversationTemplate = {
  id: 'free-text',
  version: 1,
  name: 'Free text',
  fields: { notes: { input_type: 'TEXT', report_changes: true } },
};

const resolveTemplate = (templateId: string): ConversationTemplate | undefined =>
  [investigation, escalation, freeText].find(({ id }) => id === templateId);

const snapshot = (
  metadata: ConversationFieldSnapshot['metadata'],
  templateId: string | null = 'investigation'
): ConversationFieldSnapshot => ({
  id: 'conversation-1',
  metadata,
  ...(templateId ? { template_id: templateId } : {}),
});

describe('describeConversationFieldsChanged', () => {
  it('describes every reported field one write changed as one event, in declaration order', () => {
    expect(
      describeConversationFieldsChanged({
        after: snapshot({ status: 'closed', close_reason: 'benign', verdict: 'free text' }),
        before: snapshot({ status: 'open' }),
        resolveTemplate,
        source: 'execution',
      })
    ).toEqual({
      conversation_id: 'conversation-1',
      template_id: 'investigation',
      source: 'execution',
      change_kind: 'updated',
      changed_fields: { status: true, close_reason: true },
      changes: [
        { field: 'status', previous_value: 'open', next_value: 'closed' },
        { field: 'close_reason', next_value: 'benign' },
      ],
    });
  });

  it('describes a reopen as a status change only, since the close reason is kept', () => {
    expect(
      describeConversationFieldsChanged({
        after: snapshot({ status: 'open', close_reason: 'benign' }),
        before: snapshot({ status: 'closed', close_reason: 'benign' }),
        resolveTemplate,
        source: 'http_api',
      })
    ).toEqual({
      conversation_id: 'conversation-1',
      template_id: 'investigation',
      source: 'http_api',
      change_kind: 'updated',
      changed_fields: { status: true },
      changes: [{ field: 'status', previous_value: 'closed', next_value: 'open' }],
    });
  });

  it('omits the next value when the write cleared the field', () => {
    expect(
      describeConversationFieldsChanged({
        after: snapshot({ status: 'open' }),
        before: snapshot({ status: 'closed', close_reason: 'benign' }),
        resolveTemplate,
        source: 'server_api',
      })
    ).toEqual(
      expect.objectContaining({
        changed_fields: { status: true, close_reason: true },
        changes: [
          { field: 'status', previous_value: 'closed', next_value: 'open' },
          { field: 'close_reason', previous_value: 'benign' },
        ],
      })
    );
  });

  it('treats an empty string as a cleared value', () => {
    expect(
      describeConversationFieldsChanged({
        after: snapshot({ status: 'open', close_reason: '' }),
        before: snapshot({ status: 'open' }),
        resolveTemplate,
        source: 'workflow',
      })
    ).toBeUndefined();
  });

  it('describes the values a create sets as created, with no previous values', () => {
    expect(
      describeConversationFieldsChanged({
        after: snapshot({ status: 'open', severity: 'low' }),
        resolveTemplate,
        source: 'server_api',
      })
    ).toEqual({
      conversation_id: 'conversation-1',
      template_id: 'investigation',
      source: 'server_api',
      change_kind: 'created',
      changed_fields: { status: true },
      changes: [{ field: 'status', next_value: 'open' }],
    });
  });

  it('reports no previous values when the write applied a different template', () => {
    expect(
      describeConversationFieldsChanged({
        after: snapshot({ status: 'open' }, 'escalation'),
        before: snapshot({ status: 'closed', close_reason: 'benign' }),
        resolveTemplate,
        source: 'http_api',
      })
    ).toEqual({
      conversation_id: 'conversation-1',
      template_id: 'escalation',
      source: 'http_api',
      change_kind: 'updated',
      changed_fields: { status: true },
      changes: [{ field: 'status', next_value: 'open' }],
    });
  });

  it('reports a value the write applying the template kept as a change from nothing', () => {
    expect(
      describeConversationFieldsChanged({
        after: snapshot({ status: 'open' }, 'escalation'),
        before: snapshot({ status: 'open' }, null),
        resolveTemplate,
        source: 'workflow',
      })
    ).toEqual(expect.objectContaining({ changes: [{ field: 'status', next_value: 'open' }] }));
  });

  it('reports a stored value outside the options as unrecognized', () => {
    expect(
      describeConversationFieldsChanged({
        after: snapshot({ status: 'archived', close_reason: ['benign'] }),
        before: snapshot({ status: 'paused' }),
        resolveTemplate,
        source: 'execution',
      })
    ).toEqual(
      expect.objectContaining({
        changes: [
          {
            field: 'status',
            previous_value: UNRECOGNIZED_FIELD_VALUE,
            next_value: UNRECOGNIZED_FIELD_VALUE,
          },
          { field: 'close_reason', next_value: UNRECOGNIZED_FIELD_VALUE },
        ],
      })
    );
    expect(UNRECOGNIZED_FIELD_VALUE).toBe('unrecognized');
  });

  it('keeps changed_fields and changes in step', () => {
    const event = describeConversationFieldsChanged({
      after: snapshot({ status: 'closed', close_reason: 'false_positive' }),
      before: snapshot({ status: 'open', close_reason: 'benign' }),
      resolveTemplate,
      source: 'workflow',
    });

    expect(Object.keys(event?.changed_fields ?? {})).toEqual(
      event?.changes.map(({ field }) => field)
    );
  });

  it('reports changed_fields as a record of each changed field name to true', () => {
    const event = describeConversationFieldsChanged({
      after: snapshot({ status: 'closed', close_reason: 'false_positive' }),
      before: snapshot({ status: 'open' }),
      resolveTemplate,
      source: 'execution',
    });

    expect(event?.changed_fields).toStrictEqual({ status: true, close_reason: true });
  });

  it('ignores fields the template does not opt in, even when they change', () => {
    expect(
      describeConversationFieldsChanged({
        after: snapshot({ status: 'open', severity: 'high', verdict: 'changed' }),
        before: snapshot({ status: 'open', severity: 'low', verdict: 'original' }),
        resolveTemplate,
        source: 'execution',
      })
    ).toBeUndefined();
  });

  it('never reports a non-SELECT field, even one marked report_changes', () => {
    expect(
      describeConversationFieldsChanged({
        after: snapshot({ notes: 'secret' }, 'free-text'),
        before: snapshot({ notes: 'other secret' }, 'free-text'),
        resolveTemplate,
        source: 'execution',
      })
    ).toBeUndefined();
  });

  it('reports nothing for a write that leaves the reported fields as they were', () => {
    expect(
      describeConversationFieldsChanged({
        after: snapshot({ status: 'closed', close_reason: 'benign' }),
        before: snapshot({ status: 'closed', close_reason: 'benign' }),
        resolveTemplate,
        source: 'execution',
      })
    ).toBeUndefined();
  });

  it('reports nothing for a conversation without a template', () => {
    expect(
      describeConversationFieldsChanged({
        after: snapshot({ status: 'closed' }, null),
        before: snapshot({ status: 'open' }, null),
        resolveTemplate,
        source: 'execution',
      })
    ).toBeUndefined();
  });

  it('reports nothing when the template is not registered', () => {
    expect(
      describeConversationFieldsChanged({
        after: snapshot({ status: 'closed' }, 'unknown'),
        before: snapshot({ status: 'open' }, 'unknown'),
        resolveTemplate,
        source: 'execution',
      })
    ).toBeUndefined();
  });
});
