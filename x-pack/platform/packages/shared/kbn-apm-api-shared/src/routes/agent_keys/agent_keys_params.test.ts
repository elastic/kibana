/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PrivilegeType } from '@kbn/apm-types';
import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { createAgentKeyRoute } from './create_agent_key';
import { invalidateAgentKeyRoute } from './invalidate_agent_key';

describe('createAgentKeyRoute params', () => {
  it('accepts a name and known privileges', () => {
    const result = createAgentKeyRoute.params!.safeParse({
      body: { name: 'my-key', privileges: [PrivilegeType.EVENT] },
    });

    expectParseSuccess(result);
  });

  it('rejects an unknown privilege', () => {
    const result = createAgentKeyRoute.params!.safeParse({
      body: { name: 'my-key', privileges: ['manage_own_api_key'] },
    });

    expectParseError(result);
  });
});

describe('invalidateAgentKeyRoute params', () => {
  it('accepts an id', () => {
    const result = invalidateAgentKeyRoute.params!.safeParse({ body: { id: 'abc' } });

    expectParseSuccess(result);
  });

  it('rejects a missing id', () => {
    const result = invalidateAgentKeyRoute.params!.safeParse({ body: {} });

    expectParseError(result);
  });
});
