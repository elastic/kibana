/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import { TemplateUserActionPayloadSchema, TemplateUserActionSchema } from './v1';

describe('TemplateUserActionPayloadSchema', () => {
  it('accepts a payload with a template object', () => {
    const result = TemplateUserActionPayloadSchema.safeParse({
      template: { id: 'tmpl-1', version: 3 },
    });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual({ template: { id: 'tmpl-1', version: 3 } });
  });

  it('accepts a payload with null template (remove)', () => {
    const result = TemplateUserActionPayloadSchema.safeParse({ template: null });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual({ template: null });
  });

  it('rejects a payload with a missing template field', () => {
    const result = TemplateUserActionPayloadSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('strips extra fields from the payload', () => {
    const result = TemplateUserActionPayloadSchema.safeParse({
      template: { id: 'tmpl-1', version: 3 },
      extra: 'drop',
    });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual({ template: { id: 'tmpl-1', version: 3 } });
  });
});

describe('TemplateUserActionSchema', () => {
  const validApplyRequest = {
    type: UserActionTypes.template,
    payload: { template: { id: 'tmpl-1', version: 3 } },
  };

  const validRemoveRequest = {
    type: UserActionTypes.template,
    payload: { template: null },
  };

  it('accepts an apply-template action', () => {
    const result = TemplateUserActionSchema.safeParse(validApplyRequest);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(validApplyRequest);
  });

  it('accepts a remove-template action (null payload)', () => {
    const result = TemplateUserActionSchema.safeParse(validRemoveRequest);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(validRemoveRequest);
  });

  it('strips extra top-level fields', () => {
    const result = TemplateUserActionSchema.safeParse({ ...validApplyRequest, extra: 'drop' });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(validApplyRequest);
  });

  it('strips extra fields from payload', () => {
    const result = TemplateUserActionSchema.safeParse({
      ...validApplyRequest,
      payload: { ...validApplyRequest.payload, extra: 'drop' },
    });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(validApplyRequest);
  });

  it('rejects a wrong type', () => {
    const result = TemplateUserActionSchema.safeParse({ ...validApplyRequest, type: 'title' });
    expect(result.success).toBe(false);
  });
});
