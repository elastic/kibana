/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick } from 'lodash/fp';

import { esFilters } from '../../../../../../../../src/plugins/data/public';
import { Rule } from '../../../containers/detection_engine/rules';
import { AboutStepRule, DefineStepRule, IMitreEnterpriseAttack, ScheduleStepRule } from './types';

interface GetStepsData {
  aboutRuleData: AboutStepRule | null;
  defineRuleData: DefineStepRule | null;
  scheduleRuleData: ScheduleStepRule | null;
}

export const getStepsData = ({
  rule,
  detailsView = false,
}: {
  rule: Rule | null;
  detailsView?: boolean;
}): GetStepsData => {
  const defineRuleData: DefineStepRule | null =
    rule != null
      ? {
        isNew: false,
        index: rule.index,
        queryBar: {
          query: { query: rule.query as string, language: rule.language },
          filters: rule.filters as esFilters.Filter[],
          saved_id: rule.saved_id ?? null,
        },
      }
      : null;
  const aboutRuleData: AboutStepRule | null =
    rule != null
      ? {
        isNew: false,
        ...pick(['description', 'name', 'references', 'severity', 'tags', 'threats'], rule),
        ...(detailsView ? { name: '' } : {}),
        threats: rule.threats as IMitreEnterpriseAttack[],
        falsePositives: rule.false_positives,
        riskScore: rule.risk_score,
      }
      : null;
  const scheduleRuleData: ScheduleStepRule | null =
    rule != null
      ? {
        isNew: false,
        ...pick(['enabled', 'interval'], rule),
        from:
          rule?.meta?.from != null
            ? rule.meta.from.replace('now-', '')
            : rule.from.replace('now-', ''),
      }
      : null;

  return { aboutRuleData, defineRuleData, scheduleRuleData };
};
