/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import { TemplateUserActionPayloadRt, TemplateUserActionRt } from './v1';

describe('TemplateUserActionPayloadRt', () => {
  it('accepts a payload with a template object', () => {
    expect(
      TemplateUserActionPayloadRt.decode({ template: { id: 'tmpl-1', version: 3 } })
    ).toStrictEqual({
      _tag: 'Right',
      right: { template: { id: 'tmpl-1', version: 3 } },
    });
  });

  it('accepts a payload with null template (remove)', () => {
    expect(TemplateUserActionPayloadRt.decode({ template: null })).toStrictEqual({
      _tag: 'Right',
      right: { template: null },
    });
  });

  it('rejects a payload with a missing template field', () => {
    const result = TemplateUserActionPayloadRt.decode({});
    expect(result._tag).toBe('Left');
  });

  it('strips extra fields from the payload', () => {
    expect(
      TemplateUserActionPayloadRt.decode({ template: { id: 'tmpl-1', version: 3 }, extra: 'drop' })
    ).toStrictEqual({
      _tag: 'Right',
      right: { template: { id: 'tmpl-1', version: 3 } },
    });
  });
});

describe('TemplateUserActionRt', () => {
  const validApplyRequest = {
    type: UserActionTypes.template,
    payload: { template: { id: 'tmpl-1', version: 3 } },
  };

  const validRemoveRequest = {
    type: UserActionTypes.template,
    payload: { template: null },
  };

  it('accepts an apply-template action', () => {
    expect(TemplateUserActionRt.decode(validApplyRequest)).toStrictEqual({
      _tag: 'Right',
      right: validApplyRequest,
    });
  });

  it('accepts a remove-template action (null payload)', () => {
    expect(TemplateUserActionRt.decode(validRemoveRequest)).toStrictEqual({
      _tag: 'Right',
      right: validRemoveRequest,
    });
  });

  it('strips extra top-level fields', () => {
    expect(TemplateUserActionRt.decode({ ...validApplyRequest, extra: 'drop' })).toStrictEqual({
      _tag: 'Right',
      right: validApplyRequest,
    });
  });

  it('strips extra fields from payload', () => {
    expect(
      TemplateUserActionRt.decode({
        ...validApplyRequest,
        payload: { ...validApplyRequest.payload, extra: 'drop' },
      })
    ).toStrictEqual({
      _tag: 'Right',
      right: validApplyRequest,
    });
  });

  it('rejects a wrong type', () => {
    const result = TemplateUserActionRt.decode({ ...validApplyRequest, type: 'title' });
    expect(result._tag).toBe('Left');
  });
});
