/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useService } from '@kbn/core-di-browser';
import { RulesApi } from '../services/rules_api';
import type { RuleDetails } from '../services/rules_api';

const DEFAULT_RULE_VALUES: RuleDetails = {
  id: '',
  name: '',
  kind: 'alert',
  tags: [],
  schedule: { custom: '5m' },
  enabled: true,
  query: '',
  timeField: '',
  lookbackWindow: '5m',
  groupingKey: [],
  createdBy: null,
  createdAt: undefined,
  updatedBy: null,
  updatedAt: undefined,
};

export function useExistingRule(ruleId: string | undefined) {
  const rulesApi = useService(RulesApi);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rule, setRule] = useState<RuleDetails | null>(null);

  useEffect(() => {
    if (!ruleId) {
      setRule(null);
      return;
    }

    const loadRule = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const fetchedRule = await rulesApi.getRule(ruleId);

        const transformedRule: RuleDetails = {
          ...DEFAULT_RULE_VALUES,
          id: fetchedRule.id,
          name: fetchedRule.name,
          kind: fetchedRule.kind ?? DEFAULT_RULE_VALUES.kind,
          tags: fetchedRule.tags ?? DEFAULT_RULE_VALUES.tags,
          enabled: fetchedRule.enabled ?? DEFAULT_RULE_VALUES.enabled,
          query: fetchedRule.query ?? DEFAULT_RULE_VALUES.query,
          timeField: fetchedRule.timeField ?? DEFAULT_RULE_VALUES.timeField,
          lookbackWindow: fetchedRule.lookbackWindow ?? DEFAULT_RULE_VALUES.lookbackWindow,
          groupingKey: fetchedRule.groupingKey ?? DEFAULT_RULE_VALUES.groupingKey,
          schedule: fetchedRule.schedule?.custom
            ? { custom: fetchedRule.schedule.custom }
            : DEFAULT_RULE_VALUES.schedule,
          createdBy: fetchedRule.createdBy ?? DEFAULT_RULE_VALUES.createdBy,
          createdAt: fetchedRule.createdAt ?? DEFAULT_RULE_VALUES.createdAt,
          updatedBy: fetchedRule.updatedBy ?? DEFAULT_RULE_VALUES.updatedBy,
          updatedAt: fetchedRule.updatedAt ?? DEFAULT_RULE_VALUES.updatedAt,
        };

        setRule(transformedRule);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadRule();
  }, [ruleId, rulesApi]);

  return { rule, isLoading, error };
}
