/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '../../rules_client';
import { rulesClientMock } from '../../mocks';
import {
  validateInternalRuleTypesBulkOperation,
  validateInternalRuleTypesByQuery,
} from './validate_internal_rule_types_by_query';

describe('internal rule types lib', () => {
  const req = { ids: ['1', '2'], filter: 'someFilter' };
  const rulesClient = rulesClientMock.create() as unknown as RulesClient;
  const ruleTypes = new Map();
  const operationText = 'edit';

  beforeEach(() => {
    jest.clearAllMocks();
    rulesClient.getRuleTypesByQuery = jest.fn().mockResolvedValue({
      ruleTypes: ['internal'],
    });

    ruleTypes.set('non-internal', {
      id: 'non-internal',
      name: 'Non-Internal',
      internallyManaged: false,
    });

    ruleTypes.set('internal', { id: 'internal', name: 'Internal', internallyManaged: true });
  });

  describe('validateInternalRuleTypesByQuery', () => {
    it('should throw an error for invalid rule types', async () => {
      await expect(
        validateInternalRuleTypesByQuery({ req, rulesClient, ruleTypes, operationText })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot edit rules of type \\"internal\\" because they are internally managed."`
      );
    });

    it('should not throw an error for valid rule types', async () => {
      rulesClient.getRuleTypesByQuery = jest.fn().mockResolvedValue({
        ruleTypes: ['non-internal'],
      });

      await expect(
        validateInternalRuleTypesByQuery({ req, rulesClient, ruleTypes, operationText })
      ).resolves.not.toThrow();
    });

    it('should throw an error for non found rule types', async () => {
      ruleTypes.clear();

      await expect(
        validateInternalRuleTypesByQuery({ req, rulesClient, ruleTypes, operationText })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Rule types not found: internal"`);
    });

    it('should not throw an error if the ids and filter are undefined', async () => {
      await expect(
        validateInternalRuleTypesByQuery({
          req: { ids: undefined, filter: undefined },
          rulesClient,
          ruleTypes,
          operationText,
        })
      ).resolves.not.toThrow();
    });

    it('should not throw an error if the ids is empty and the filter is undefined', async () => {
      await expect(
        validateInternalRuleTypesByQuery({
          req: { ids: [], filter: undefined },
          rulesClient,
          ruleTypes,
          operationText,
        })
      ).resolves.not.toThrow();
    });

    describe('validateInternalRuleTypesBulkOperation', () => {
      it('should throw an error for invalid rule types when passing ids', async () => {
        rulesClient.getRuleTypesByQuery = jest.fn().mockResolvedValue({
          ruleTypes: ['internal'],
        });

        await expect(
          validateInternalRuleTypesBulkOperation({
            ids: req.ids,
            rulesClient,
            ruleTypes,
            operationText,
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Cannot edit rules of type \\"internal\\" because they are internally managed."`
        );
      });

      it('should not throw an error if the ids are undefined', async () => {
        await expect(
          validateInternalRuleTypesBulkOperation({
            ids: undefined,
            rulesClient,
            ruleTypes,
            operationText,
          })
        ).resolves.not.toThrow();
      });
    });
  });
});
