/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { getRuleBuilderCreateOptions } from '@kbn/alerting-v2-rule-form';
import { applyRuleBuilderRegistrations } from '../rule_builder_registration';

export type RuleBuilderCreateCard = ReturnType<typeof getRuleBuilderCreateOptions>[number];

export const useRuleBuilderCreateOptions = (): RuleBuilderCreateCard[] => {
  const [options, setOptions] = useState(getRuleBuilderCreateOptions);

  useEffect(() => {
    let cancelled = false;
    void applyRuleBuilderRegistrations().then(() => {
      if (cancelled) {
        return;
      }
      const next = getRuleBuilderCreateOptions();
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
