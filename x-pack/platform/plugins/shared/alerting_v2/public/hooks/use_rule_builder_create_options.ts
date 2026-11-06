/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { RuleBuilderCreateCard } from '@kbn/alerting-v2-rule-form';
import { applyRuleBuilderRegistrations } from '../rule_builder_registration';
import { ruleBuilderRegistry } from '../rule_builder_registry';

export type { RuleBuilderCreateCard };

export const useRuleBuilderCreateOptions = (): RuleBuilderCreateCard[] => {
  const [options, setOptions] = useState(() => ruleBuilderRegistry.getCreateOptions());

  useEffect(() => {
    let cancelled = false;
    void applyRuleBuilderRegistrations().then((registry) => {
      if (cancelled) {
        return;
      }
      const next = registry.getCreateOptions();
      setOptions((current) =>
        current.length === next.length &&
        current.every((option, index) => option.type === next[index]?.type)
          ? current
          : next
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return options;
};
