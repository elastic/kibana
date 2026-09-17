/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import type { ActionsClientContext } from '../../../../actions_client';
import { actionsAuthorizationMock } from '../../../../authorization/actions_authorization.mock';
import { getConnectorSpecsAsJsonSchema } from './get_connector_specs';

const authorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();

function createContext(): ActionsClientContext {
  return { authorization, auditLogger } as unknown as ActionsClientContext;
}

describe('getConnectorSpecsAsJsonSchema', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authorization.ensureAuthorized.mockResolvedValue(undefined);
  });

  describe('authorization', () => {
    test('ensures user is authorised to get actions before returning the catalog', async () => {
      await getConnectorSpecsAsJsonSchema({ context: createContext() });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
    });

    test('throws when user is not authorised to get actions', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized to get actions'));

      await expect(
        getConnectorSpecsAsJsonSchema({ context: createContext() })
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized to get actions]`);
    });
  });

  it('returns at least one spec type without handler-like keys', async () => {
    const result = await getConnectorSpecsAsJsonSchema({ context: createContext() });

    expect(result.specs.length).toBeGreaterThan(0);
    expect(result.specs.some((spec) => spec.id === '.alienvault-otx')).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/"handler"/);
    expect(JSON.stringify(result)).not.toMatch(/handleEvents/);
  });

  it('marks inbound-only specs', async () => {
    const result = await getConnectorSpecsAsJsonSchema({ context: createContext() });
    const inbound = result.specs.find((spec) => spec.id === '.inboundWebhook');

    expect(inbound?.isInboundOnly).toBe(true);
    expect(inbound?.events?.definitions.length).toBeGreaterThan(0);
  });
});
