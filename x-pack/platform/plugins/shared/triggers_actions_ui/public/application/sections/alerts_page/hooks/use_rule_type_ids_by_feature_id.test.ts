/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useRuleTypeIdsByFeatureId } from './use_rule_type_ids_by_feature_id';
import { ruleTypesIndex } from '../../../mock/rule_types_index';
import { MULTI_CONSUMER_RULE_TYPE_IDS } from '../../../constants';
import { AlertConsumers } from '@kbn/rule-data-utils';

describe('useRuleTypeIdsByFeatureId', () => {
  it('should correctly reverse the rule types index', () => {
    const { result } = renderHook(() => useRuleTypeIdsByFeatureId(ruleTypesIndex));
    expect(Object.keys(result.current)).toEqual([
      'stackAlerts',
      'observability',
      'monitoring',
      'siem',
    ]);
    Object.values(result.current).forEach((ruleTypes) => {
      expect(ruleTypes).not.toHaveLength(0);
    });
  });

  it("should group o11y apps rule types inside a common 'observability' key", () => {
    const { result } = renderHook(() => useRuleTypeIdsByFeatureId(ruleTypesIndex));
    expect(result.current.observability).toEqual(
      expect.arrayContaining([
        'slo.rules.burnRate',
        'xpack.uptime.alerts.tls',
        'xpack.uptime.alerts.tlsCertificate',
        'xpack.uptime.alerts.monitorStatus',
        'xpack.uptime.alerts.durationAnomaly',
        'xpack.synthetics.alerts.monitorStatus',
        'xpack.synthetics.alerts.tls',
        'metrics.alert.threshold',
        'metrics.alert.inventory.threshold',
        'observability.rules.custom_threshold',
        'logs.alert.document.count',
        'apm.error_rate',
        'apm.transaction_error_rate',
        'apm.transaction_duration',
        'apm.anomaly',
      ])
    );
  });

  it('should list multi-consumer rule types both in o11y and Stack management', () => {
    const { result } = renderHook(() => useRuleTypeIdsByFeatureId(ruleTypesIndex));
    [AlertConsumers.OBSERVABILITY, AlertConsumers.STACK_ALERTS].forEach((featureId) => {
      expect(result.current[featureId]).toEqual(
        expect.arrayContaining(MULTI_CONSUMER_RULE_TYPE_IDS)
      );
    });
  });
});
