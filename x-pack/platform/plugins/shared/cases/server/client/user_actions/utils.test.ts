/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../../../common/types/domain';
import type { UserActionTransformedAttributes } from '../../common/types/user_actions';
import { projectUserActionForSearch } from './utils';

const createExtendedFieldsAttributes = (
  overrides: Partial<UserActionTransformedAttributes> = {}
): UserActionTransformedAttributes =>
  ({
    action: 'update',
    created_at: '2024-01-01T00:00:00Z',
    created_by: { username: 'testuser', full_name: 'Test User', email: 'test@test.com' },
    type: UserActionTypes.extended_fields,
    payload: {
      extended_fields: {
        my_field: 'xyzaua',
        label: 'option_1',
      },
    },
    owner: 'securitySolution',
    ...overrides,
  } as UserActionTransformedAttributes);

describe('projectUserActionForSearch', () => {
  it('returns attributes unchanged when search is empty', () => {
    const attributes = createExtendedFieldsAttributes();
    expect(projectUserActionForSearch(attributes, '')).toBe(attributes);
  });

  it('returns non-extended_fields attributes unchanged', () => {
    const attributes = createExtendedFieldsAttributes({
      type: UserActionTypes.comment,
      payload: {
        comment: { type: 'user', comment: 'Hello', owner: 'securitySolution' },
      },
    } as Partial<UserActionTransformedAttributes>);

    expect(projectUserActionForSearch(attributes, 'Hello')).toBe(attributes);
  });

  it('returns null when value projection leaves no fields', () => {
    const attributes = createExtendedFieldsAttributes({
      payload: {
        extended_fields: {
          // Non-string values cannot survive a value-hit projection.
          nested: { text: 'xyzaua' },
          flag: true,
        },
      },
    } as Partial<UserActionTransformedAttributes>);

    expect(projectUserActionForSearch(attributes, 'xyzaua')).toBeNull();
  });

  it('returns null for an empty extended_fields map on a value hit', () => {
    const attributes = createExtendedFieldsAttributes({
      payload: { extended_fields: {} },
    } as Partial<UserActionTransformedAttributes>);

    expect(projectUserActionForSearch(attributes, 'xyzaua')).toBeNull();
  });
});
