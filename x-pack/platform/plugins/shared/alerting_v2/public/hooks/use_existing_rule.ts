/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { CreateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';
import { useService, CoreStart } from '@kbn/core-di-browser';

const DEFAULT_RULE_VALUES: CreateRuleData = {
  name: '',
  kind: 'alert',
  tags: [],
  schedule: { custom: '5m' },
  enabled: true,
  query: '',
  timeField: '',
  lookbackWindow: '5m',
  groupingKey: [],
};

export function useExistingRule(ruleId: string | undefined) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rule, setRule] = useState<CreateRuleData | null>(null);
  const http = useService(CoreStart('http'));

  useEffect(() => {
    if (!ruleId) {
      setRule(null);
      return;
    }

    const loadRule = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const fetchedRule = await http.get<RuleResponse>(`/internal/alerting/v2/rule/${ruleId}`);

        const transformedRule: CreateRuleData = {
          ...DEFAULT_RULE_VALUES,
          name: fetchedRule.name,
          tags: fetchedRule.tags ?? DEFAULT_RULE_VALUES.tags,
          enabled: fetchedRule.enabled ?? DEFAULT_RULE_VALUES.enabled,
          query: fetchedRule.query ?? DEFAULT_RULE_VALUES.query,
          timeField: fetchedRule.timeField ?? DEFAULT_RULE_VALUES.timeField,
          lookbackWindow: fetchedRule.lookbackWindow ?? DEFAULT_RULE_VALUES.lookbackWindow,
          groupingKey: fetchedRule.groupingKey ?? DEFAULT_RULE_VALUES.groupingKey,
          schedule: fetchedRule.schedule?.custom
            ? { custom: fetchedRule.schedule.custom }
            : DEFAULT_RULE_VALUES.schedule,
        };

        setRule(transformedRule);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadRule();
  }, [ruleId, http]);

  return { rule, isLoading, error };
}
