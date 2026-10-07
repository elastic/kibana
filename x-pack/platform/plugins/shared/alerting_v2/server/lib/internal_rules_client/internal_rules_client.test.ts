/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Container } from 'inversify';
import { MAX_BULK_ITEMS } from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import { coreMock } from '@kbn/core/server/mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { ALERTING_ERROR_CODES, ALERTING_LOG_CODES } from '../errors/error_codes';
import { EventOriginToken, type EventOrigin } from '../event_origin/token';
import { RulesClient } from '../rules_client';
import type { BulkResponse } from '../rules_client';
import { createRulesClient } from '../rules_client/rules_client.mock';
import { createRulesSavedObjectServiceMock } from '../services/rules_saved_object_service/rules_saved_object_service.mock';
import type { RulesFindAllResultItem } from '../services/rules_saved_object_service/rules_saved_object_service';
import { RuleSavedObjectsClientToken } from '../services/rules_saved_object_service/tokens';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';
import { createRuleSoAttributes } from '../test_utils';
import { InternalRulesClient } from './internal_rules_client';
import { InternalRulesClientProvider } from './internal_rules_client_provider';

const foundRule = (id: string, namespaces?: string[]): RulesFindAllResultItem => ({
  id,
  namespaces,
  attributes: createRuleSoAttributes(),
});

interface ScopeSnapshot {
  spaceId: string;
  origin: EventOrigin;
  headers: Record<string, unknown>;
  soClient: unknown;
}

const setup = (
  found: RulesFindAllResultItem[],
  bulkDisableBySpace: Record<string, () => Promise<BulkResponse>> = {},
  releaseFails = false
) => {
  const savedObjects = coreMock.createStart().savedObjects;
  const internalSoClient = savedObjects.getUnsafeInternalClient();
  const namespacedSoClient = savedObjects.getUnsafeInternalClient();
  jest.mocked(internalSoClient.asScopedToNamespace).mockReturnValue(namespacedSoClient);
  savedObjects.getUnsafeInternalClient.mockReturnValue(internalSoClient);

  const spaces = spacesMock.createStart();
  spaces.spacesService.spaceIdToNamespace.mockImplementation((spaceId: string) =>
    spaceId === 'default' ? undefined : spaceId
  );

  const rulesSavedObjectService = createRulesSavedObjectServiceMock();
  rulesSavedObjectService.findByIds.mockResolvedValue(found);

  const snapshots: ScopeSnapshot[] = [];
  const scopes: Container[] = [];
  const bulkDisableRules = jest.fn(async (spaceId: string, ids: string[]) => {
    const disable = bulkDisableBySpace[spaceId];
    return disable ? disable() : { affected_count: ids.length, errors: [] };
  });
  const injection = {
    fork: jest.fn(() => {
      const scope = new Container();
      const unbind = jest.spyOn(scope, 'unbindAllAsync');
      if (releaseFails) {
        unbind.mockRejectedValue(new Error('release failed'));
      }
      scopes.push(scope);
      scope.bind(RulesClient).toDynamicValue(({ get }) => {
        const spaceId = get(RequestSpaceIdToken);
        snapshots.push({
          spaceId,
          origin: get(EventOriginToken),
          headers: get(Request).headers,
          soClient: get(RuleSavedObjectsClientToken),
        });
        const { rulesClient } = createRulesClient();
        jest
          .spyOn(rulesClient, 'bulkDisableRules')
          .mockImplementation(({ ids }) => bulkDisableRules(spaceId, ids));
        return rulesClient;
      });
      return scope;
    }),
    getContainer: jest.fn(),
  };

  const { loggerService, mockLogger } = createLoggerService();
  const provider = new InternalRulesClientProvider(injection, savedObjects, spaces, loggerService);
  const client = new InternalRulesClient(provider, rulesSavedObjectService);
  return {
    client,
    mockLogger,
    findByIds: rulesSavedObjectService.findByIds,
    bulkDisableRules,
    snapshots,
    scopes,
    internalSoClient,
    namespacedSoClient,
  };
};

describe('InternalRulesClient', () => {
  describe('bulkDisableRules', () => {
    it("disables each rule in its own space as the internal user and releases each space's scope", async () => {
      const {
        client,
        findByIds,
        bulkDisableRules,
        snapshots,
        scopes,
        internalSoClient,
        namespacedSoClient,
      } = setup([
        foundRule('rule-1', ['default']),
        foundRule('rule-2', ['space-a']),
        foundRule('rule-3', ['default']),
      ]);

      const result = await client.bulkDisableRules({
        ids: ['rule-1', 'rule-2', 'rule-3', 'rule-1'],
      });

      expect(findByIds).toHaveBeenCalledWith(['rule-1', 'rule-2', 'rule-3'], {
        fields: expect.any(Array),
      });
      expect(bulkDisableRules).toHaveBeenCalledWith('default', ['rule-1', 'rule-3']);
      expect(bulkDisableRules).toHaveBeenCalledWith('space-a', ['rule-2']);
      expect(snapshots).toEqual([
        { spaceId: 'default', origin: 'internal', headers: {}, soClient: internalSoClient },
        { spaceId: 'space-a', origin: 'internal', headers: {}, soClient: namespacedSoClient },
      ]);
      expect(scopes).toHaveLength(2);
      for (const scope of scopes) {
        expect(scope.unbindAllAsync).toHaveBeenCalledTimes(1);
      }
      expect(result).toEqual({ affected_count: 3, errors: [] });
    });

    it('reports unknown ids as RULE_NOT_FOUND and ids the HTTP API rejects as errors without looking them up', async () => {
      const invalidId = 'x" OR alerting_rule.id: * OR alerting_rule.id: "x';
      const { client, findByIds, scopes } = setup([]);

      const result = await client.bulkDisableRules({ ids: ['missing', invalidId] });

      expect(findByIds).toHaveBeenCalledWith(['missing'], expect.anything());
      expect(scopes).toHaveLength(0);
      expect(result).toEqual({
        affected_count: 0,
        errors: [
          {
            id: 'missing',
            error: expect.objectContaining({ code: ALERTING_ERROR_CODES.RULE_NOT_FOUND }),
          },
          {
            id: invalidId,
            error: expect.objectContaining({
              message: `Rule id "${invalidId}" is not a valid rule id`,
            }),
          },
        ],
      });
    });

    it('combines the per-rule errors of every space and reports a failing space without stopping the others', async () => {
      const conflict = {
        id: 'rule-1',
        error: { code: ALERTING_ERROR_CODES.RULE_VERSION_CONFLICT, message: 'conflict' },
      };
      const { client, scopes } = setup(
        [
          foundRule('rule-1', ['default']),
          foundRule('rule-2', ['space-a']),
          foundRule('rule-3', ['space-b']),
        ],
        {
          default: async () => ({ affected_count: 0, errors: [conflict] }),
          'space-a': async () => {
            throw new Error('boom');
          },
        }
      );

      const result = await client.bulkDisableRules({ ids: ['rule-1', 'rule-2', 'rule-3'] });

      expect(result).toEqual({
        affected_count: 1,
        errors: [conflict, { id: 'rule-2', error: expect.objectContaining({ message: 'boom' }) }],
      });
      for (const scope of scopes) {
        expect(scope.unbindAllAsync).toHaveBeenCalledTimes(1);
      }
    });

    it('returns the disable when releasing the space scope fails', async () => {
      const { client, mockLogger } = setup([foundRule('rule-1', ['default'])], {}, true);

      const result = await client.bulkDisableRules({ ids: ['rule-1'] });

      expect(result).toEqual({ affected_count: 1, errors: [] });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          labels: expect.objectContaining({
            code: ALERTING_LOG_CODES.INTERNAL_RULES_CLIENT_SCOPE_RELEASE_FAILED,
          }),
        })
      );
    });

    it('rejects more than MAX_BULK_ITEMS unique ids before reading any rule', async () => {
      const { client, findByIds } = setup([]);
      const uniqueIds = Array.from({ length: MAX_BULK_ITEMS }, (_, i) => `rule-${i}`);

      await client.bulkDisableRules({ ids: [...uniqueIds, 'rule-0'] });
      expect(findByIds).toHaveBeenCalledTimes(1);

      findByIds.mockClear();
      await expect(
        client.bulkDisableRules({ ids: [...uniqueIds, 'one-too-many'] })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(findByIds).not.toHaveBeenCalled();
    });
  });
});
