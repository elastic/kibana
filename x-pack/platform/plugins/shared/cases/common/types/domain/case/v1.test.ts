/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../attachment/v1';
import { ConnectorTypes } from '../connector/v1';
import { CASE_EXTENDED_FIELDS } from '../../../constants';
import {
  CaseAttributesSchema,
  CaseSettingsSchema,
  RelatedCaseSchema,
} from '../../domain_zod/case/v1';
import {
  CaseAttributesRt,
  CaseSettingsRt,
  CaseSeverity,
  CasesRt,
  CaseStatuses,
  RelatedCaseRt,
} from './v1';

const basicCase = {
  owner: 'cases',
  closed_at: null,
  closed_by: null,
  id: 'basic-case-id',
  comments: [
    {
      comment: 'Solve this fast!',
      type: AttachmentType.user,
      id: 'basic-comment-id',
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      owner: 'cases',
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
      version: 'WzQ3LDFc',
    },
  ],
  created_at: '2020-02-19T23:06:33.798Z',
  created_by: {
    full_name: 'Leslie Knope',
    username: 'lknope',
    email: 'leslie.knope@elastic.co',
  },
  connector: {
    id: 'none',
    name: 'My Connector',
    type: ConnectorTypes.none,
    fields: null,
  },
  description: 'Security banana Issue',
  severity: CaseSeverity.LOW,
  duration: null,
  external_service: null,
  status: CaseStatuses.open,
  tags: ['coke', 'pepsi'],
  title: 'Another horrible breach!!',
  totalComment: 1,
  totalAlerts: 0,
  totalEvents: 0,
  updated_at: '2020-02-20T15:02:57.995Z',
  updated_by: {
    full_name: 'Leslie Knope',
    username: 'lknope',
    email: 'leslie.knope@elastic.co',
  },
  version: 'WzQ3LDFd',
  settings: {
    syncAlerts: true,
    extractObservables: false,
  },
  // damaged_raccoon uid
  assignees: [{ uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
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
  incremental_id: undefined,
  in_progress_at: undefined,
  time_to_acknowledge: undefined,
  time_to_investigate: undefined,
  time_to_resolve: undefined,
};

describe('RelatedCaseRt', () => {
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
    const query = RelatedCaseRt.decode(defaultRequest);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });

  it('removes foo:bar attributes from request', () => {
    const query = RelatedCaseRt.decode({ ...defaultRequest, foo: 'bar' });

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });

  it('removes foo:bar attributes from totals', () => {
    const query = RelatedCaseRt.decode({
      ...defaultRequest,
      totals: { ...defaultRequest.totals, foo: 'bar' },
    });

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });

  it('zod: has expected attributes in request', () => {
    const result = RelatedCaseSchema.safeParse(defaultRequest);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(defaultRequest);
  });

  it('zod: strips unknown fields', () => {
    const result = RelatedCaseSchema.safeParse({ ...defaultRequest, foo: 'bar' });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(defaultRequest);
  });
});

describe('SettingsRt', () => {
  it('has expected attributes in request', () => {
    const query = CaseSettingsRt.decode({ syncAlerts: true, extractObservables: true });

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: { syncAlerts: true, extractObservables: true },
    });
  });

  it('removes foo:bar attributes from request', () => {
    const query = CaseSettingsRt.decode({
      syncAlerts: false,
      extractObservables: false,
      foo: 'bar',
    });

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: { syncAlerts: false, extractObservables: false },
    });
  });

  it('zod: has expected attributes in request', () => {
    const result = CaseSettingsSchema.safeParse({ syncAlerts: true, extractObservables: true });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual({ syncAlerts: true, extractObservables: true });
  });

  it('zod: strips unknown fields', () => {
    const result = CaseSettingsSchema.safeParse({
      syncAlerts: false,
      extractObservables: false,
      foo: 'bar',
    });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual({ syncAlerts: false, extractObservables: false });
  });
});

describe('CaseAttributesRt', () => {
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
    in_progress_at: undefined,
    time_to_acknowledge: undefined,
    time_to_investigate: undefined,
    time_to_resolve: undefined,
  };

  it('has expected attributes in request', () => {
    const query = CaseAttributesRt.decode(defaultRequest);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });

  it('removes foo:bar attributes from request', () => {
    const query = CaseAttributesRt.decode({ ...defaultRequest, foo: 'bar' });

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });

  it('removes foo:bar attributes from connector', () => {
    const query = CaseAttributesRt.decode({
      ...defaultRequest,
      connector: { ...defaultRequest.connector, foo: 'bar' },
    });

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });

  it('removes foo:bar attributes from created_by', () => {
    const query = CaseAttributesRt.decode({
      ...defaultRequest,
      created_by: { ...defaultRequest.created_by, foo: 'bar' },
    });

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });

  it('accepts optional template and extended_fields', () => {
    const request = {
      ...defaultRequest,
      template: { id: 'template-id', version: 1 },
      [CASE_EXTENDED_FIELDS]: { field1: 'foo' },
    };

    const query = CaseAttributesRt.decode(request);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: request,
    });
  });

  it('removes unknown attributes from template', () => {
    const request = {
      ...defaultRequest,
      template: { id: 'template-id', version: 1, foo: 'bar' },
    };

    const query = CaseAttributesRt.decode(request);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: {
        ...defaultRequest,
        template: { id: 'template-id', version: 1 },
      },
    });
  });

  it('zod: has expected attributes in request', () => {
    const zodRequest = {
      description: defaultRequest.description,
      status: defaultRequest.status,
      tags: defaultRequest.tags,
      title: defaultRequest.title,
      connector: defaultRequest.connector,
      settings: defaultRequest.settings,
      owner: defaultRequest.owner,
      severity: defaultRequest.severity,
      assignees: defaultRequest.assignees,
      duration: defaultRequest.duration,
      closed_at: defaultRequest.closed_at,
      closed_by: defaultRequest.closed_by,
      created_at: defaultRequest.created_at,
      created_by: defaultRequest.created_by,
      external_service: defaultRequest.external_service,
      updated_at: defaultRequest.updated_at,
      updated_by: defaultRequest.updated_by,
      category: defaultRequest.category,
      customFields: defaultRequest.customFields,
      observables: defaultRequest.observables,
      total_observables: defaultRequest.total_observables,
    };
    const result = CaseAttributesSchema.safeParse(zodRequest);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(zodRequest);
  });

  it('zod: strips unknown fields', () => {
    const zodRequest = {
      description: defaultRequest.description,
      status: defaultRequest.status,
      tags: defaultRequest.tags,
      title: defaultRequest.title,
      connector: defaultRequest.connector,
      settings: defaultRequest.settings,
      owner: defaultRequest.owner,
      severity: defaultRequest.severity,
      assignees: defaultRequest.assignees,
      duration: defaultRequest.duration,
      closed_at: defaultRequest.closed_at,
      closed_by: defaultRequest.closed_by,
      created_at: defaultRequest.created_at,
      created_by: defaultRequest.created_by,
      external_service: defaultRequest.external_service,
      updated_at: defaultRequest.updated_at,
      updated_by: defaultRequest.updated_by,
      category: defaultRequest.category,
      customFields: defaultRequest.customFields,
      observables: defaultRequest.observables,
      total_observables: defaultRequest.total_observables,
    };
    const result = CaseAttributesSchema.safeParse({ ...zodRequest, foo: 'bar' });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(zodRequest);
  });

  it('zod: strips unknown fields from connector', () => {
    const zodRequest = {
      description: defaultRequest.description,
      status: defaultRequest.status,
      tags: defaultRequest.tags,
      title: defaultRequest.title,
      connector: defaultRequest.connector,
      settings: defaultRequest.settings,
      owner: defaultRequest.owner,
      severity: defaultRequest.severity,
      assignees: defaultRequest.assignees,
      duration: defaultRequest.duration,
      closed_at: defaultRequest.closed_at,
      closed_by: defaultRequest.closed_by,
      created_at: defaultRequest.created_at,
      created_by: defaultRequest.created_by,
      external_service: defaultRequest.external_service,
      updated_at: defaultRequest.updated_at,
      updated_by: defaultRequest.updated_by,
      category: defaultRequest.category,
      customFields: defaultRequest.customFields,
      observables: defaultRequest.observables,
      total_observables: defaultRequest.total_observables,
    };
    const result = CaseAttributesSchema.safeParse({
      ...zodRequest,
      connector: { ...zodRequest.connector, foo: 'bar' },
    });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(zodRequest);
  });

  it('zod: accepts optional template and extended_fields', () => {
    const zodRequest = {
      description: defaultRequest.description,
      status: defaultRequest.status,
      tags: defaultRequest.tags,
      title: defaultRequest.title,
      connector: defaultRequest.connector,
      settings: defaultRequest.settings,
      owner: defaultRequest.owner,
      severity: defaultRequest.severity,
      assignees: defaultRequest.assignees,
      duration: defaultRequest.duration,
      closed_at: defaultRequest.closed_at,
      closed_by: defaultRequest.closed_by,
      created_at: defaultRequest.created_at,
      created_by: defaultRequest.created_by,
      external_service: defaultRequest.external_service,
      updated_at: defaultRequest.updated_at,
      updated_by: defaultRequest.updated_by,
      category: defaultRequest.category,
      customFields: defaultRequest.customFields,
      observables: defaultRequest.observables,
      total_observables: defaultRequest.total_observables,
      template: { id: 'template-id', version: 1 },
      [CASE_EXTENDED_FIELDS]: { field1: 'foo' },
    };
    const result = CaseAttributesSchema.safeParse(zodRequest);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(zodRequest);
  });
});

describe('CasesRt', () => {
  const defaultRequest = [
    {
      ...basicCase,
    },
  ];

  it('has expected attributes in request', () => {
    const query = CasesRt.decode(defaultRequest);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });

  it('removes foo:bar attributes from request', () => {
    const query = CasesRt.decode([{ ...defaultRequest[0], foo: 'bar' }]);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });
});
