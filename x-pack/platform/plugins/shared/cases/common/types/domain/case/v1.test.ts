/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypes } from '../connector/v1';
import { CASE_EXTENDED_FIELDS } from '../../../constants';
import {
  CaseAttributesSchema,
  CaseSettingsSchema,
  CasesSchema,
  RelatedCaseSchema,
  CaseSeverity,
  CaseStatuses,
} from './v1';

describe('RelatedCaseSchema', () => {
  const defaultRequest = {
    id: 'basic-case-id',
    title: 'basic-case-title',
    description: 'this is a simple description',
    status: CaseStatuses.open,
    createdAt: '2023-01-17T09:46:29.813Z',
    totals: {
      alerts: 5,
      userComments: 2,
      events: 0,
    },
  };

  it('has expected attributes in request', () => {
    const result = RelatedCaseSchema.safeParse(defaultRequest);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(defaultRequest);
  });

  it('strips unknown fields', () => {
    const result = RelatedCaseSchema.safeParse({ ...defaultRequest, foo: 'bar' });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(defaultRequest);
  });

  it('strips unknown fields from totals', () => {
    const result = RelatedCaseSchema.safeParse({
      ...defaultRequest,
      totals: { ...defaultRequest.totals, foo: 'bar' },
    });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(defaultRequest);
  });
});

describe('CaseSettingsSchema', () => {
  it('has expected attributes in request', () => {
    const result = CaseSettingsSchema.safeParse({ syncAlerts: true, extractObservables: true });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual({ syncAlerts: true, extractObservables: true });
  });

  it('strips unknown fields', () => {
    const result = CaseSettingsSchema.safeParse({
      syncAlerts: false,
      extractObservables: false,
      foo: 'bar',
    });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual({ syncAlerts: false, extractObservables: false });
  });
});

describe('CaseAttributesSchema', () => {
  const defaultRequest = {
    description: 'A description',
    status: CaseStatuses.open,
    tags: ['new', 'case'],
    title: 'My new case',
    connector: {
      id: '123',
      name: 'My connector',
      type: ConnectorTypes.jira,
      fields: { issueType: 'Task', priority: 'High', parent: null },
    },
    settings: {
      syncAlerts: true,
      extractObservables: true,
    },
    owner: 'cases',
    severity: CaseSeverity.LOW,
    assignees: [{ uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
    duration: null,
    closed_at: null,
    closed_by: null,
    created_at: '2020-02-19T23:06:33.798Z',
    created_by: {
      full_name: 'Leslie Knope',
      username: 'lknope',
      email: 'leslie.knope@elastic.co',
    },
    external_service: null,
    updated_at: '2020-02-20T15:02:57.995Z',
    updated_by: null,
    category: null,
    customFields: [
      {
        key: 'first_custom_field_key',
        type: 'text',
        value: 'this is a text field value',
      },
      {
        key: 'second_custom_field_key',
        type: 'toggle',
        value: true,
      },
      {
        key: 'third_custom_field_key',
        type: 'number',
        value: 0,
      },
    ],
    observables: [],
    total_observables: 0,
  };

  it('has expected attributes in request', () => {
    const result = CaseAttributesSchema.safeParse(defaultRequest);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(defaultRequest);
  });

  it('strips unknown fields', () => {
    const result = CaseAttributesSchema.safeParse({ ...defaultRequest, foo: 'bar' });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(defaultRequest);
  });

  it('strips unknown fields from connector', () => {
    const result = CaseAttributesSchema.safeParse({
      ...defaultRequest,
      connector: { ...defaultRequest.connector, foo: 'bar' },
    });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(defaultRequest);
  });

  it('strips unknown fields from created_by', () => {
    const result = CaseAttributesSchema.safeParse({
      ...defaultRequest,
      created_by: { ...defaultRequest.created_by, foo: 'bar' },
    });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(defaultRequest);
  });

  it('accepts optional template and extended_fields', () => {
    const zodRequest = {
      ...defaultRequest,
      template: { id: 'template-id', version: 1 },
      [CASE_EXTENDED_FIELDS]: { field1: 'foo' },
    };
    const result = CaseAttributesSchema.safeParse(zodRequest);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(zodRequest);
  });

  it('strips unknown fields from template', () => {
    const result = CaseAttributesSchema.safeParse({
      ...defaultRequest,
      template: { id: 'template-id', version: 1, foo: 'bar' },
      [CASE_EXTENDED_FIELDS]: { field1: 'foo' },
    });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual({
      ...defaultRequest,
      template: { id: 'template-id', version: 1 },
      [CASE_EXTENDED_FIELDS]: { field1: 'foo' },
    });
  });
});

describe('CasesSchema', () => {
  const caseItem = {
    description: 'A description',
    status: CaseStatuses.open,
    tags: ['new', 'case'],
    title: 'My new case',
    connector: {
      id: '123',
      name: 'My connector',
      type: ConnectorTypes.jira,
      fields: { issueType: 'Task', priority: 'High', parent: null },
    },
    settings: { syncAlerts: true, extractObservables: true },
    owner: 'cases',
    severity: CaseSeverity.LOW,
    assignees: [{ uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
    duration: null,
    closed_at: null,
    closed_by: null,
    created_at: '2020-02-19T23:06:33.798Z',
    created_by: { full_name: 'Leslie Knope', username: 'lknope', email: 'leslie.knope@elastic.co' },
    external_service: null,
    updated_at: '2020-02-20T15:02:57.995Z',
    updated_by: null,
    category: null,
    customFields: [],
    observables: [],
    total_observables: 0,
    id: 'case-id',
    version: 'WzQ3LDFd',
    totalComment: 3,
    totalAlerts: 1,
  };

  it('has expected attributes in request', () => {
    const result = CasesSchema.safeParse([caseItem]);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual([caseItem]);
  });

  it('strips unknown fields', () => {
    const result = CasesSchema.safeParse([{ ...caseItem, foo: 'bar' }]);
    expect(result.success).toBe(true);
    expect(result.data?.[0]).not.toHaveProperty('foo');
    expect(result.data?.[0]).toMatchObject(caseItem);
  });
});
