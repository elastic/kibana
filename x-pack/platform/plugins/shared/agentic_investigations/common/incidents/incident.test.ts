/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES,
  CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH,
  CONVERSATION_ID_MAX_LENGTH,
  CONVERSATION_TITLE_MAX_LENGTH,
} from '@kbn/agent-builder-common';
import { createIncidentRequestSchema, updateIncidentRequestSchema } from './incident';
import { MAX_INCIDENT_LINKED_INVESTIGATIONS } from './constants';

// ---------------------------------------------------------------------------
// createIncidentRequestSchema
// ---------------------------------------------------------------------------

describe('createIncidentRequestSchema', () => {
  const validPublic = {
    linked_investigation_id: 'inv-1',
    visibility: 'public',
    // collaborators defaults to []
  };

  const validPrivate = {
    linked_investigation_id: 'inv-1',
    visibility: 'private',
    collaborators: ['user-a'],
  };

  it('accepts a valid public creation', () => {
    expect(() => createIncidentRequestSchema.parse(validPublic)).not.toThrow();
  });

  it('accepts a valid private creation', () => {
    expect(() => createIncidentRequestSchema.parse(validPrivate)).not.toThrow();
  });

  it('rejects private without collaborators', () => {
    expect(() =>
      createIncidentRequestSchema.parse({
        ...validPrivate,
        collaborators: [],
      })
    ).toThrow(/collaborators is required/);
  });

  it('rejects public with collaborators', () => {
    expect(() =>
      createIncidentRequestSchema.parse({
        ...validPublic,
        collaborators: ['user-a'],
      })
    ).toThrow(/collaborators must not be set/);
  });

  it('rejects when linked_investigation_id is empty', () => {
    expect(() =>
      createIncidentRequestSchema.parse({ ...validPublic, linked_investigation_id: '' })
    ).toThrow();
  });

  it('rejects when linked_investigation_id exceeds the max length', () => {
    expect(() =>
      createIncidentRequestSchema.parse({
        ...validPublic,
        linked_investigation_id: 'a'.repeat(CONVERSATION_ID_MAX_LENGTH + 1),
      })
    ).toThrow();
  });

  it('rejects when a collaborator id is empty', () => {
    expect(() =>
      createIncidentRequestSchema.parse({
        ...validPrivate,
        collaborators: [''],
      })
    ).toThrow();
  });

  it('rejects when a collaborator id exceeds the max length', () => {
    expect(() =>
      createIncidentRequestSchema.parse({
        ...validPrivate,
        collaborators: ['a'.repeat(CONVERSATION_ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH + 1)],
      })
    ).toThrow();
  });

  it('rejects when collaborators exceeds the max entry count', () => {
    expect(() =>
      createIncidentRequestSchema.parse({
        ...validPrivate,
        collaborators: Array.from({ length: CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES + 1 }, (_, i) =>
          `user-${i}`
        ),
      })
    ).toThrow();
  });

  it('defaults collaborators to [] when omitted', () => {
    const result = createIncidentRequestSchema.parse(validPublic);
    expect(result.collaborators).toEqual([]);
  });

  it('rejects an unrecognised visibility value', () => {
    expect(() =>
      createIncidentRequestSchema.parse({ ...validPublic, visibility: 'workspace' })
    ).toThrow();
  });

  it('rejects when visibility is missing', () => {
    const { visibility: _v, ...rest } = validPublic;
    expect(() => createIncidentRequestSchema.parse(rest)).toThrow();
  });

  it('rejects when linked_investigation_id is missing', () => {
    const { linked_investigation_id: _id, ...rest } = validPublic;
    expect(() => createIncidentRequestSchema.parse(rest)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// updateIncidentRequestSchema
// ---------------------------------------------------------------------------

describe('updateIncidentRequestSchema', () => {
  it('accepts a title-only update', () => {
    expect(() =>
      updateIncidentRequestSchema.parse({ title: 'Renamed incident' })
    ).not.toThrow();
  });

  it('accepts a links-only update', () => {
    expect(() =>
      updateIncidentRequestSchema.parse({ linked_investigations: ['inv-2'] })
    ).not.toThrow();
  });

  it('accepts both title and linked_investigations together', () => {
    expect(() =>
      updateIncidentRequestSchema.parse({ title: 'Renamed', linked_investigations: ['inv-2'] })
    ).not.toThrow();
  });

  it('rejects an empty body (neither field provided)', () => {
    expect(() => updateIncidentRequestSchema.parse({})).toThrow(
      /at least one of title or linked_investigations must be provided/
    );
  });

  it('rejects an empty title string', () => {
    expect(() => updateIncidentRequestSchema.parse({ title: '' })).toThrow();
  });

  it('rejects a title that exceeds the max length', () => {
    expect(() =>
      updateIncidentRequestSchema.parse({ title: 'a'.repeat(CONVERSATION_TITLE_MAX_LENGTH + 1) })
    ).toThrow();
  });

  it('rejects an empty linked_investigations array (min: 1)', () => {
    expect(() =>
      updateIncidentRequestSchema.parse({ linked_investigations: [] })
    ).toThrow();
  });

  it('rejects when a linked investigation id is empty', () => {
    expect(() =>
      updateIncidentRequestSchema.parse({ linked_investigations: [''] })
    ).toThrow();
  });

  it('rejects when a linked investigation id exceeds max length', () => {
    expect(() =>
      updateIncidentRequestSchema.parse({
        linked_investigations: ['a'.repeat(CONVERSATION_ID_MAX_LENGTH + 1)],
      })
    ).toThrow();
  });

  it('rejects when linked_investigations exceeds the max count', () => {
    expect(() =>
      updateIncidentRequestSchema.parse({
        linked_investigations: Array.from(
          { length: MAX_INCIDENT_LINKED_INVESTIGATIONS + 1 },
          (_, i) => `inv-${i}`
        ),
      })
    ).toThrow();
  });
});
