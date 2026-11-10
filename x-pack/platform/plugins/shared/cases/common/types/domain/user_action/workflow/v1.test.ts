/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import {
  WorkflowPayloadSchema,
  WorkflowOriginSchema,
  WorkflowUserActionPayloadSchema,
  WorkflowUserActionSchema,
} from './v1';
import {
  CASE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
  ATTACHMENTS_WORKFLOW_ORIGIN_TYPE,
  ATTACHMENT_WORKFLOW_ORIGIN_TYPE,
} from './constants';

const defaultWorkflow = { id: 'wf-1', name: 'My Workflow', executionId: 'exec-1' };
const caseOrigin = { type: CASE_WORKFLOW_ORIGIN_TYPE, id: 'case-1' };
const observableOrigin = {
  type: OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
  id: 'obs-1',
  typeKey: 'ip',
  value: '1.2.3.4',
};

describe('WorkflowPayloadSchema', () => {
  it('accepts a valid workflow payload', () => {
    expect(WorkflowPayloadSchema.safeParse(defaultWorkflow).data).toStrictEqual(defaultWorkflow);
  });

  it('strips excess keys', () => {
    expect(
      WorkflowPayloadSchema.safeParse({ ...defaultWorkflow, extra: 'nope' }).data
    ).toStrictEqual(defaultWorkflow);
  });
});

describe('WorkflowOriginSchema', () => {
  it.each([
    ['cases.case', caseOrigin],
    ['cases.observable', observableOrigin],
    [
      'cases.attachment',
      {
        type: ATTACHMENT_WORKFLOW_ORIGIN_TYPE,
        id: 'alert-1',
        attachmentType: 'security.alert',
        index: '.alerts-security.alerts-default',
      },
    ],
    [
      'cases.attachments',
      {
        type: ATTACHMENTS_WORKFLOW_ORIGIN_TYPE,
        id: 'case-1',
        attachmentType: 'security.alert',
        count: 2,
      },
    ],
  ] as const)('accepts origin type %s', (_label, origin) => {
    const result = WorkflowOriginSchema.safeParse(origin);
    expect(result.success).toBe(true);
  });

  it('strips excess keys', () => {
    expect(WorkflowOriginSchema.safeParse({ ...caseOrigin, unknown: 'field' }).data).toStrictEqual(
      caseOrigin
    );
  });

  it('rejects an unknown origin type', () => {
    const result = WorkflowOriginSchema.safeParse({ type: 'cases.unknown', id: 'x' });
    expect(result.success).toBe(false);
  });

  it('rejects the removed cases.comment origin', () => {
    const result = WorkflowOriginSchema.safeParse({ type: 'cases.comment', id: 'x' });
    expect(result.success).toBe(false);
  });

  it.each(['cases.alert', 'cases.alerts', 'cases.event'])(
    'rejects removed origin type %s',
    (type) => {
      const result = WorkflowOriginSchema.safeParse({ type, id: 'x' });
      expect(result.success).toBe(false);
    }
  );
});

describe('WorkflowUserActionPayloadSchema', () => {
  const defaultPayload = { workflow: defaultWorkflow, origin: caseOrigin };

  it('has expected attributes', () => {
    expect(WorkflowUserActionPayloadSchema.safeParse(defaultPayload).data).toStrictEqual(
      defaultPayload
    );
  });

  it('accepts a payload without an origin for list-surface runs', () => {
    const payload = { workflow: defaultWorkflow };
    expect(WorkflowUserActionPayloadSchema.safeParse(payload).data).toStrictEqual(payload);
  });

  it('removes foo:bar attributes from payload', () => {
    expect(
      WorkflowUserActionPayloadSchema.safeParse({ ...defaultPayload, foo: 'bar' }).data
    ).toStrictEqual(defaultPayload);
  });
});

describe('WorkflowUserActionSchema', () => {
  const defaultRequest = {
    type: UserActionTypes.workflow,
    payload: { workflow: defaultWorkflow, origin: caseOrigin },
  };

  it('has expected attributes', () => {
    expect(WorkflowUserActionSchema.safeParse(defaultRequest).data).toStrictEqual(defaultRequest);
  });

  it('strips excess keys at the top level', () => {
    expect(
      WorkflowUserActionSchema.safeParse({ ...defaultRequest, foo: 'bar' }).data
    ).toStrictEqual(defaultRequest);
  });

  it('strips excess keys inside payload', () => {
    expect(
      WorkflowUserActionSchema.safeParse({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      }).data
    ).toStrictEqual(defaultRequest);
  });
});
