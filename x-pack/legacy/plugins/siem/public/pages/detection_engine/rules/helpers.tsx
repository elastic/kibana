/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, pick } from 'lodash/fp';
import { useLocation } from 'react-router-dom';

import { esFilters } from '../../../../../../../../src/plugins/data/public';
import { Rule } from '../../../containers/detection_engine/rules';
import { FormData, FormHook, FormSchema } from './components/shared_imports';
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
          timeline: {
            id: rule.timeline_id ?? null,
            title: rule.timeline_title ?? null,
          },
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

export const useQuery = () => new URLSearchParams(useLocation().search);

export const setFieldValue = (
  form: FormHook<FormData>,
  schema: FormSchema<FormData>,
  defaultValues: unknown
) =>
  Object.keys(schema).forEach(key => {
    const val = get(key, defaultValues);
    if (val != null) {
      form.setFieldValue(key, val);
    }
  });
