/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { RESOLUTION_RULE_IDS, RESOLUTION_RULE_KINDS } from '../../../../common';
import { EntityResolutionRuleTypeName } from './saved_object';
import { ResolutionRulesClient } from './rule_client';

const NAMESPACE = 'default';

const createClient = (soClient: Partial<SavedObjectsClientContract>) =>
  new ResolutionRulesClient(soClient as SavedObjectsClientContract, NAMESPACE, loggerMock.create());

describe('ResolutionRulesClient', () => {
  it('returns in-code defaults when no overrides exist', async () => {
    const soClient = {
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
    };
    const client = createClient(soClient);

    await expect(client.getEffectiveRules()).resolves.toEqual([
      {
        id: RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH,
        kind: RESOLUTION_RULE_KINDS.SAME_FIELD,
        managed: true,
        enabled: true,
      },
      {
        id: RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION,
        kind: RESOLUTION_RULE_KINDS.RELATED_USER_ALIAS_RESOLUTION,
        managed: true,
        enabled: false,
      },
    ]);
  });

  it('merges saved object overrides over in-code defaults', async () => {
    const soClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          {
            attributes: {
              id: RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION,
              kind: RESOLUTION_RULE_KINDS.RELATED_USER_ALIAS_RESOLUTION,
              managed: true,
              enabled: true,
            },
          },
        ],
      }),
    };
    const client = createClient(soClient);

    const rules = await client.getEffectiveRules();

    expect(
      rules.find((rule) => rule.id === RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION)?.enabled
    ).toBe(true);
  });

  it('creates an override when setting enabled for the first time', async () => {
    const soClient = {
      create: jest.fn().mockResolvedValue({}),
    };
    const client = createClient(soClient);

    await expect(
      client.setEnabled(RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION, true)
    ).resolves.toMatchObject({
      id: RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION,
      enabled: true,
    });

    expect(soClient.create).toHaveBeenCalledWith(
      EntityResolutionRuleTypeName,
      {
        id: RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION,
        kind: RESOLUTION_RULE_KINDS.RELATED_USER_ALIAS_RESOLUTION,
        managed: true,
        enabled: true,
      },
      expect.objectContaining({ refresh: 'wait_for' })
    );
  });

  it('updates an existing override on create conflict', async () => {
    const soClient = {
      create: jest
        .fn()
        .mockRejectedValue(
          SavedObjectsErrorHelpers.createConflictError(EntityResolutionRuleTypeName, 'id')
        ),
      update: jest.fn().mockResolvedValue({}),
    };
    const client = createClient(soClient);

    await client.setEnabled(RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH, false);

    expect(soClient.update).toHaveBeenCalledWith(
      EntityResolutionRuleTypeName,
      expect.stringContaining(RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH),
      expect.objectContaining({ enabled: false }),
      expect.objectContaining({ refresh: 'wait_for', mergeAttributes: true })
    );
  });

  it('rejects unknown rule ids', async () => {
    const client = createClient({});

    const error = await client.setEnabled('unknown' as never, true).catch((err) => err);

    expect(SavedObjectsErrorHelpers.isNotFoundError(error)).toBe(true);
  });
});
