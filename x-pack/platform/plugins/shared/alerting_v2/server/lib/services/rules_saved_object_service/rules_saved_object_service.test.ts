/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { RulesSavedObjectService } from './rules_saved_object_service';
import { createRulesSavedObjectService } from './rules_saved_object_service.mock';

const mockEsqlResponse = (values: Array<[number, string]>) =>
  ({
    columns: [
      { name: 'occurrences', type: 'long' },
      { name: 'interval', type: 'keyword' },
    ],
    values,
  } as Awaited<ReturnType<SavedObjectsClientContract['esql']>>);

describe('RulesSavedObjectService', () => {
  let rulesSavedObjectService: RulesSavedObjectService;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    ({ rulesSavedObjectService, mockSavedObjectsClient } = createRulesSavedObjectService());
  });

  describe('getTotalScheduledPerMinute', () => {
    it('aggregates enabled rules across all spaces and sums their per-minute frequency', async () => {
      mockSavedObjectsClient.esql.mockResolvedValue(
        mockEsqlResponse([
          [3, '1m'], // 3 * 1 = 3
          [2, '30s'], // 2 * 2 = 4
          [5, '5m'], // 5 * 0.2 = 1
        ])
      );

      const total = await rulesSavedObjectService.getTotalScheduledPerMinute();

      expect(total).toBeCloseTo(8);
      expect(mockSavedObjectsClient.esql).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RULE_SAVED_OBJECT_TYPE,
          namespaces: ['*'],
          querySettings: { unmappedFields: 'load' },
          pipeline: expect.any(Object),
        })
      );
    });

    it('returns 0 when there are no ES|QL results', async () => {
      mockSavedObjectsClient.esql.mockResolvedValue(mockEsqlResponse([]));

      expect(await rulesSavedObjectService.getTotalScheduledPerMinute()).toBe(0);
    });
  });
});
