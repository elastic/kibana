/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH,
  CONVERSATION_ID_MAX_LENGTH,
} from '@kbn/agent-builder-common';
import {
  createEscalationRequestSchema,
  linkEscalationRequestSchema,
  listEscalationsQuerySchema,
} from './escalation';
import {
  MAX_ESCALATION_ASSIGNEES,
  MAX_ESCALATION_LINKED_INVESTIGATIONS,
  MAX_ESCALATIONS_PAGE_SIZE,
} from './constants';

// ---------------------------------------------------------------------------
// createEscalationRequestSchema
// ---------------------------------------------------------------------------

describe('createEscalationRequestSchema', () => {
  const validPublic = {
    linked_investigation_id: 'inv-1',
    visibility: 'public',
    assignees: ['user-a'],
  };

  const validPrivate = {
    linked_investigation_id: 'inv-1',
    visibility: 'private',
    assignees: ['user-a'],
  };

  it('accepts a valid public creation', () => {
    expect(() => createEscalationRequestSchema.parse(validPublic)).not.toThrow();
  });

  it('accepts a valid private creation', () => {
    expect(() => createEscalationRequestSchema.parse(validPrivate)).not.toThrow();
  });

  it('rejects when assignees is empty', () => {
    expect(() => createEscalationRequestSchema.parse({ ...validPublic, assignees: [] })).toThrow();
  });

  it('rejects when assignees is missing', () => {
    const { assignees: _a, ...rest } = validPublic;
    expect(() => createEscalationRequestSchema.parse(rest)).toThrow();
  });

  it('rejects when an assignee id is empty', () => {
    expect(() =>
      createEscalationRequestSchema.parse({ ...validPublic, assignees: [''] })
    ).toThrow();
  });

  it('rejects when an assignee id exceeds the max length', () => {
    expect(() =>
      createEscalationRequestSchema.parse({
        ...validPublic,
        assignees: ['a'.repeat(CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH + 1)],
      })
    ).toThrow();
  });

  it('rejects when assignees exceeds the max count', () => {
    expect(() =>
      createEscalationRequestSchema.parse({
        ...validPublic,
        assignees: Array.from({ length: MAX_ESCALATION_ASSIGNEES + 1 }, (_, i) => `user-${i}`),
      })
    ).toThrow();
  });

  it('rejects when linked_investigation_id is empty', () => {
    expect(() =>
      createEscalationRequestSchema.parse({ ...validPublic, linked_investigation_id: '' })
    ).toThrow();
  });

  it('rejects when linked_investigation_id exceeds the max length', () => {
    expect(() =>
      createEscalationRequestSchema.parse({
        ...validPublic,
        linked_investigation_id: 'a'.repeat(CONVERSATION_ID_MAX_LENGTH + 1),
      })
    ).toThrow();
  });

  it('rejects an unrecognised visibility value', () => {
    expect(() =>
      createEscalationRequestSchema.parse({ ...validPublic, visibility: 'workspace' })
    ).toThrow();
  });

  it('rejects when visibility is missing', () => {
    const { visibility: _v, ...rest } = validPublic;
    expect(() => createEscalationRequestSchema.parse(rest)).toThrow();
  });

  it('rejects when linked_investigation_id is missing', () => {
    const { linked_investigation_id: _id, ...rest } = validPublic;
    expect(() => createEscalationRequestSchema.parse(rest)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// linkEscalationRequestSchema
// ---------------------------------------------------------------------------

describe('linkEscalationRequestSchema', () => {
  it('accepts a valid linked_investigations array', () => {
    expect(() =>
      linkEscalationRequestSchema.parse({ linked_investigations: ['inv-1'] })
    ).not.toThrow();
  });

  it('rejects a missing linked_investigations field', () => {
    expect(() => linkEscalationRequestSchema.parse({})).toThrow();
  });

  it('rejects an empty linked_investigations array (min: 1)', () => {
    expect(() => linkEscalationRequestSchema.parse({ linked_investigations: [] })).toThrow();
  });

  it('rejects when a linked investigation id is empty', () => {
    expect(() => linkEscalationRequestSchema.parse({ linked_investigations: [''] })).toThrow();
  });

  it('rejects when a linked investigation id exceeds max length', () => {
    expect(() =>
      linkEscalationRequestSchema.parse({
        linked_investigations: ['a'.repeat(CONVERSATION_ID_MAX_LENGTH + 1)],
      })
    ).toThrow();
  });

  it('rejects when linked_investigations exceeds the max count', () => {
    expect(() =>
      linkEscalationRequestSchema.parse({
        linked_investigations: Array.from(
          { length: MAX_ESCALATION_LINKED_INVESTIGATIONS + 1 },
          (_, i) => `inv-${i}`
        ),
      })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// listEscalationsQuerySchema
// ---------------------------------------------------------------------------

describe('listEscalationsQuerySchema', () => {
  it('defaults page to 1 and per_page to MAX_ESCALATIONS_PAGE_SIZE when omitted', () => {
    const result = listEscalationsQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.per_page).toBe(MAX_ESCALATIONS_PAGE_SIZE);
  });

  it('coerces string query-param values to numbers', () => {
    const result = listEscalationsQuerySchema.parse({ page: '2', per_page: '10' });
    expect(result.page).toBe(2);
    expect(result.per_page).toBe(10);
  });

  it('accepts page=1 and per_page=1 (minimum valid values)', () => {
    expect(() => listEscalationsQuerySchema.parse({ page: 1, per_page: 1 })).not.toThrow();
  });

  it('accepts page=1 and per_page=MAX_ESCALATIONS_PAGE_SIZE (maximum per_page)', () => {
    expect(() =>
      listEscalationsQuerySchema.parse({ page: 1, per_page: MAX_ESCALATIONS_PAGE_SIZE })
    ).not.toThrow();
  });

  it('rejects page=0', () => {
    expect(() => listEscalationsQuerySchema.parse({ page: 0 })).toThrow();
  });

  it('rejects per_page=0', () => {
    expect(() => listEscalationsQuerySchema.parse({ per_page: 0 })).toThrow();
  });

  it('rejects per_page exceeding MAX_ESCALATIONS_PAGE_SIZE', () => {
    expect(() =>
      listEscalationsQuerySchema.parse({ page: 1, per_page: MAX_ESCALATIONS_PAGE_SIZE + 1 })
    ).toThrow();
  });

  it('rejects when page * per_page exceeds MAX_ESCALATIONS_RESULT_WINDOW', () => {
    // 201 * 50 = 10 050 > 10 000
    expect(() =>
      listEscalationsQuerySchema.parse({ page: 201, per_page: MAX_ESCALATIONS_PAGE_SIZE })
    ).toThrow();
  });

  it('accepts page=200 per_page=50 (= exactly 10 000, the limit)', () => {
    expect(() => listEscalationsQuerySchema.parse({ page: 200, per_page: 50 })).not.toThrow();
  });
});
