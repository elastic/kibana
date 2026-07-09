/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { PrivilegeType, privilegesTypeSchema } from './privilege_type';

describe('privilegesTypeSchema', () => {
  it('accepts an array of known privileges', () => {
    const result = privilegesTypeSchema.safeParse([
      PrivilegeType.EVENT,
      PrivilegeType.AGENT_CONFIG,
    ]);

    expectParseSuccess(result);
    expect(result.data).toEqual([PrivilegeType.EVENT, PrivilegeType.AGENT_CONFIG]);
  });

  it('accepts an empty array', () => {
    expectParseSuccess(privilegesTypeSchema.safeParse([]));
  });

  it('rejects an unknown privilege', () => {
    expectParseError(privilegesTypeSchema.safeParse(['manage_own_api_key']));
  });
});
