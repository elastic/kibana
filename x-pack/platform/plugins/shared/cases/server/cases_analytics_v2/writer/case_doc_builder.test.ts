/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import type { CasePersistedAttributes } from '../../common/types/case';
import { CasePersistedSeverity, CasePersistedStatus } from '../../common/types/case';
import { buildCaseDoc } from './case_doc_builder';

const fullCaseSO = (
  overrides: Partial<CasePersistedAttributes> = {}
): SavedObject<CasePersistedAttributes> =>
  ({
    type: CASE_SAVED_OBJECT,
    id: 'case-1',
    namespaces: ['default'],
    references: [],
    attributes: {
      owner: 'securitySolution',
      title: 'A title',
      description: 'A description',
      tags: ['tag1', 'tag2'],
      category: 'malware',
      assignees: [{ uid: 'u-1' }, { uid: 'u-2' }],
      severity: CasePersistedSeverity.HIGH,
      status: CasePersistedStatus.IN_PROGRESS,
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-02T00:00:00.000Z',
      closed_at: null,
      created_by: { username: 'jane', full_name: 'Jane', email: 'j@e.com', profile_uid: 'p-1' },
      closed_by: null,
      updated_by: null,
      duration: 12345,
      total_alerts: 3,
      total_comments: 5,
      total_events: 1,
      connector: { name: 'none', type: '.none', fields: null } as never,
      external_service: null,
      settings: { syncAlerts: false },
      observables: [
        { typeKey: 'url', value: 'http://example.com', description: 'site' },
        { typeKey: 'url', value: 'http://other.com', description: 'other' },
        { typeKey: 'ipv4', value: '1.2.3.4', description: 'ip' },
      ] as never,
      customFields: [{ key: 'cf', type: 'text', value: 'x' }] as never,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      extended_fields: { riskScore_as_long: '42' },
      ...overrides,
    } as CasePersistedAttributes,
  } as SavedObject<CasePersistedAttributes>);

describe('buildCaseDoc', () => {
  it('sets @timestamp to updated_at when present', () => {
    const doc = buildCaseDoc(fullCaseSO());
    expect(doc['@timestamp']).toBe('2026-05-02T00:00:00.000Z');
  });

  it('falls back to created_at when updated_at is null', () => {
    const doc = buildCaseDoc(fullCaseSO({ updated_at: null }));
    expect(doc['@timestamp']).toBe('2026-05-01T00:00:00.000Z');
  });

  it('populates kibana.space_ids from the SO namespaces', () => {
    const doc = buildCaseDoc(fullCaseSO());
    expect(doc.kibana.space_ids).toEqual(['default']);
  });

  it('defaults kibana.space_ids to ["default"] when namespaces is missing', () => {
    const so = fullCaseSO();
    const doc = buildCaseDoc({ ...so, namespaces: undefined });
    expect(doc.kibana.space_ids).toEqual(['default']);
  });

  it('converts numeric severity to a human-readable string', () => {
    expect(buildCaseDoc(fullCaseSO({ severity: CasePersistedSeverity.LOW })).cases.severity).toBe(
      'low'
    );
    expect(
      buildCaseDoc(fullCaseSO({ severity: CasePersistedSeverity.MEDIUM })).cases.severity
    ).toBe('medium');
    expect(buildCaseDoc(fullCaseSO({ severity: CasePersistedSeverity.HIGH })).cases.severity).toBe(
      'high'
    );
    expect(
      buildCaseDoc(fullCaseSO({ severity: CasePersistedSeverity.CRITICAL })).cases.severity
    ).toBe('critical');
  });

  it('converts numeric status to a human-readable string', () => {
    expect(buildCaseDoc(fullCaseSO({ status: CasePersistedStatus.OPEN })).cases.status).toBe(
      'open'
    );
    expect(buildCaseDoc(fullCaseSO({ status: CasePersistedStatus.IN_PROGRESS })).cases.status).toBe(
      'in-progress'
    );
    expect(buildCaseDoc(fullCaseSO({ status: CasePersistedStatus.CLOSED })).cases.status).toBe(
      'closed'
    );
  });

  it('passes customFields through as-is (matches SO shape)', () => {
    const doc = buildCaseDoc(fullCaseSO());
    expect(doc.cases.customFields).toEqual([{ key: 'cf', type: 'text', value: 'x' }]);
  });

  it('denormalizes observables into per-typeKey keyword arrays', () => {
    const doc = buildCaseDoc(fullCaseSO());
    expect(doc.cases.observables).toEqual({
      url: ['http://example.com', 'http://other.com'],
      ipv4: ['1.2.3.4'],
    });
  });

  it('drops description from denormalized observables', () => {
    const doc = buildCaseDoc(fullCaseSO());
    // No `description` anywhere in the observables tree — they're collapsed
    // into per-type keyword arrays. The full triple is still on the SO.
    expect(JSON.stringify(doc.cases.observables)).not.toContain('description');
    expect(JSON.stringify(doc.cases.observables)).not.toContain('site');
  });

  it('returns undefined observables when the SO has none', () => {
    const doc = buildCaseDoc(fullCaseSO({ observables: [] }));
    expect(doc.cases.observables).toBeUndefined();
  });

  it('skips observables without typeKey or value', () => {
    const doc = buildCaseDoc(
      fullCaseSO({
        observables: [
          { typeKey: 'url', value: 'http://good', description: '' },
          { typeKey: undefined, value: 'x' } as never,
          { typeKey: 'url', value: undefined } as never,
        ] as never,
      })
    );
    expect(doc.cases.observables).toEqual({ url: ['http://good'] });
  });

  it('passes connector and external_service through (fully indexed per mapping)', () => {
    const doc = buildCaseDoc(fullCaseSO());
    expect(doc.cases.connector).toEqual({ name: 'none', type: '.none', fields: null });
    expect(doc.cases.external_service).toBeNull();
  });

  it('passes through real-world connector shapes — id + polymorphic fields', () => {
    // Regression guard: runtime jira connectors carry an `id` and a
    // `fields` blob that is NOT `{key,value}`. The v2 strict mapping
    // must accept both (mapped `connector.id` keyword + opaque
    // `connector.fields`); a missing field declaration trips
    // `dynamic introduction of [id] within [cases.connector] is not allowed`.
    const so = fullCaseSO();
    (so.attributes as unknown as { connector: unknown }).connector = {
      id: 'connector-1',
      name: 'jira',
      type: '.jira',
      fields: { issueType: '10006', priority: 'High', parent: null },
    };
    const doc = buildCaseDoc(so);
    expect(doc.cases.connector).toEqual({
      id: 'connector-1',
      name: 'jira',
      type: '.jira',
      fields: { issueType: '10006', priority: 'High', parent: null },
    });
  });

  it('preserves the case id under cases.id', () => {
    const doc = buildCaseDoc(fullCaseSO());
    expect(doc.cases.id).toBe('case-1');
  });

  it('passes extended_fields through as a plain object', () => {
    const doc = buildCaseDoc(fullCaseSO());
    // eslint-disable-next-line @typescript-eslint/naming-convention
    expect(doc.cases.extended_fields).toEqual({ riskScore_as_long: '42' });
  });

  it('emits extended_fields as undefined when absent (keeps the doc small)', () => {
    const doc = buildCaseDoc(fullCaseSO({ extended_fields: undefined }));
    expect(doc.cases.extended_fields).toBeUndefined();
  });
});
