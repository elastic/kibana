/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { RuleSavedObjectAttributes } from '../../../saved_objects';
import { createRuleSoAttributes } from '../../test_utils';
import type { RulesSavedObjectService } from './rules_saved_object_service';
import { createRulesSavedObjectService } from './rules_saved_object_service.mock';

const buildRuleDoc = (id: string, every: string) => ({
  id,
  type: RULE_SAVED_OBJECT_TYPE,
  references: [],
  attributes: createRuleSoAttributes({
    schedule: { every, lookback: '5m' },
  }) as RuleSavedObjectAttributes,
});

const mockFinderForDocs = (docs: ReturnType<typeof buildRuleDoc>[]) =>
  ({
    async *find() {
      yield { saved_objects: docs };
    },
    close: jest.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<SavedObjectsClientContract['createPointInTimeFinder']>);

describe('RulesSavedObjectService', () => {
  let rulesSavedObjectService: RulesSavedObjectService;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    ({ rulesSavedObjectService, mockSavedObjectsClient } = createRulesSavedObjectService());
  });

  describe('getTotalScheduledPerMinute', () => {
    it('scans enabled rules across all spaces and sums their per-minute frequency', async () => {
      mockSavedObjectsClient.createPointInTimeFinder.mockReturnValue(
        mockFinderForDocs([
          buildRuleDoc('rule-a', '1m'), // 1 run / min
          buildRuleDoc('rule-b', '30s'), // 2 runs / min
          buildRuleDoc('rule-c', '5m'), // 0.2 runs / min
        ])
      );

      const total = await rulesSavedObjectService.getTotalScheduledPerMinute();

      expect(total).toBeCloseTo(3.2);
      expect(mockSavedObjectsClient.createPointInTimeFinder).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RULE_SAVED_OBJECT_TYPE,
          namespaces: ['*'],
          filter: `${RULE_SAVED_OBJECT_TYPE}.attributes.enabled: true`,
        })
      );
    });

    it('returns 0 when there are no enabled rules', async () => {
      mockSavedObjectsClient.createPointInTimeFinder.mockReturnValue(mockFinderForDocs([]));

      expect(await rulesSavedObjectService.getTotalScheduledPerMinute()).toBe(0);
    });
  });
});
