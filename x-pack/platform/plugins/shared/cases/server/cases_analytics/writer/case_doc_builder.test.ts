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

const NOW = '2026-05-06T12:00:00.000Z';
const fixedNow = () => NOW;

const baseSO = (
  overrides: Partial<SavedObject<CasePersistedAttributes>> = {}
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
      assignees: [{ uid: 'u-1' }],
      severity: CasePersistedSeverity.LOW,
      status: CasePersistedStatus.OPEN,
      created_at: '2026-05-01T00:00:00.000Z',
      created_by: { username: 'jane', full_name: 'Jane Doe', email: 'j@e.com', profile_uid: 'p-1' },
      updated_at: null,
      updated_by: null,
      closed_at: null,
      closed_by: null,
      connector: { name: 'none', type: '.none', fields: null } as any,
      external_service: null,
      settings: { syncAlerts: false },
      duration: null,
      total_alerts: 0,
      total_comments: 0,
    } as unknown as CasePersistedAttributes,
    ...overrides,
  } as SavedObject<CasePersistedAttributes>);

describe('buildCaseDoc', () => {
  it('produces an envelope with @timestamp, kibana.space_ids, and cases.owner', () => {
    const doc = buildCaseDoc(baseSO(), fixedNow);

    expect(doc['@timestamp']).toBe(NOW);
    expect(doc.kibana.space_ids).toEqual(['default']);
    expect(doc.cases.owner).toBe('securitySolution');
    expect(doc.cases.id).toBe('case-1');
  });

  it('preserves multi-namespace SOs in kibana.space_ids', () => {
    const doc = buildCaseDoc(baseSO({ namespaces: ['default', 'marketing'] }), fixedNow);
    expect(doc.kibana.space_ids).toEqual(['default', 'marketing']);
  });

  it('falls back to "default" when namespaces is missing', () => {
    const so = baseSO();
    delete (so as any).namespaces;
    const doc = buildCaseDoc(so, fixedNow);
    expect(doc.kibana.space_ids).toEqual(['default']);
  });

  it('denormalizes numeric status and severity to labels', () => {
    const doc = buildCaseDoc(
      baseSO({
        attributes: {
          ...baseSO().attributes,
          status: CasePersistedStatus.CLOSED,
          severity: CasePersistedSeverity.HIGH,
        },
      }),
      fixedNow
    );
    expect(doc.cases.status).toBe('closed');
    expect(doc.cases.severity).toBe('high');
  });

  it('only includes optional fields when present', () => {
    const doc = buildCaseDoc(baseSO(), fixedNow);
    expect(doc.cases).not.toHaveProperty('category');
    expect(doc.cases).not.toHaveProperty('updated_at');
    expect(doc.cases).not.toHaveProperty('closed_at');
    expect(doc.cases).not.toHaveProperty('duration_ms');
    expect(doc.cases).not.toHaveProperty('observables');
    expect(doc.cases).not.toHaveProperty('custom_fields');
    expect(doc.cases).not.toHaveProperty('extended_fields');
  });

  it('renames `duration` to `duration_ms`', () => {
    const doc = buildCaseDoc(
      baseSO({ attributes: { ...baseSO().attributes, duration: 12345 } }),
      fixedNow
    );
    expect(doc.cases.duration_ms).toBe(12345);
  });

  it('projects extended_fields conservatively as value_keyword', () => {
    const doc = buildCaseDoc(
      baseSO({
        attributes: {
          ...baseSO().attributes,
          extended_fields: { riskScore: 42, playbook: 'compromised-credentials' },
        },
      }),
      fixedNow
    );
    expect(doc.cases.extended_fields).toEqual({
      riskScore: { value_keyword: '42' },
      playbook: { value_keyword: 'compromised-credentials' },
    });
  });

  it('drops null extended-field values', () => {
    const doc = buildCaseDoc(
      baseSO({
        attributes: {
          ...baseSO().attributes,
          extended_fields: { riskScore: null, playbook: 'x' },
        },
      }),
      fixedNow
    );
    expect(doc.cases.extended_fields).toEqual({ playbook: { value_keyword: 'x' } });
  });
});
