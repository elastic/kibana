/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EPISODE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { createLoggerService } from '../../lib/services/logger_service/logger_service.mock';
import type { RulesClient } from '../../lib/rules_client';
import { loadRuleMetadata } from './load_rule_metadata';

describe('loadRuleMetadata', () => {
  let getRule: jest.Mock;
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];

  beforeEach(() => {
    getRule = jest.fn();
    ({ loggerService, mockLogger } = createLoggerService());
  });

  it('returns rule name and grouping fields', async () => {
    getRule.mockResolvedValueOnce({
      metadata: { name: 'Host CPU high' },
      grouping: { fields: ['host.name'] },
    });

    await expect(
      loadRuleMetadata({ getRule } as unknown as RulesClient, 'rule-1', loggerService)
    ).resolves.toEqual({
      ruleName: 'Host CPU high',
      groupingFields: ['host.name'],
    });
    expect(mockLogger.debug).not.toHaveBeenCalled();
  });

  it('logs debug and returns empty metadata when getRule fails', async () => {
    getRule.mockRejectedValueOnce(new Error('not found'));

    await expect(
      loadRuleMetadata(
        { getRule } as unknown as RulesClient,
        'rule-1',
        loggerService.withLabels({ attachment_type: EPISODE_ATTACHMENT_TYPE })
      )
    ).resolves.toEqual({});

    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Failed to load rule metadata for episode label; falling back to rule id: not found',
      { labels: { attachment_type: EPISODE_ATTACHMENT_TYPE, rule_id: 'rule-1' } }
    );
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
});
