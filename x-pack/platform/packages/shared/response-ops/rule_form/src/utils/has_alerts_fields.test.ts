/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils';
import type { RuleTypeWithDescription } from '../common/types';
import { hasAlertsFields } from './has_alerts_fields';

describe('hasAlertsFields', () => {
  test('should return true if producer is SIEM', () => {
    const hasFields = hasAlertsFields({
      ruleType: {
        producer: AlertConsumers.SIEM,
      } as RuleTypeWithDescription,
      consumer: 'stackAlerts',
      validConsumers: [],
    });

    expect(hasFields).toBeTruthy();
  });

  test('should return true if has alerts mappings', () => {
    const hasFields = hasAlertsFields({
      ruleType: {
        hasAlertsMappings: true,
      } as RuleTypeWithDescription,
      consumer: 'stackAlerts',
      validConsumers: [],
    });

    expect(hasFields).toBeTruthy();
  });
});
