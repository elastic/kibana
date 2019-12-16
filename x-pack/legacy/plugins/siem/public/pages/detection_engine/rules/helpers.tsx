/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick } from 'lodash/fp';

import { esFilters } from '../../../../../../../../src/plugins/data/common';
import { Rule } from '../../../containers/detection_engine/rules';
import {
  AboutStepRuleJson,
  DefineStepRuleJson,
  IMitreEnterpriseAttack,
  ScheduleStepRuleJson,
} from './types';

interface GetStepsData {
  aboutRuleData: AboutStepRuleJson | null;
  defineRuleData: DefineStepRuleJson | null;
  scheduleRuleData: ScheduleStepRuleJson | null;
}
export const getStepsData = ({
  rule,
  detailsView = false,
}: {
  rule: Rule | null;
  detailsView?: boolean;
}): GetStepsData => {
  const defineRuleData: DefineStepRuleJson | null =
    rule != null
      ? {
          ...pick(['index', 'language', 'query', 'saved_id'], rule),
          filters: rule.filters as esFilters.Filter[],
        }
      : null;
  const aboutRuleData: AboutStepRuleJson | null =
    rule != null
      ? {
          ...pick(
            [
              'description',
              'false_positives',
              'name',
              'references',
              'risk_score',
              'severity',
              'tags',
              'threats',
            ],
            rule
          ),
          ...(detailsView ? { name: '' } : {}),
          threats: rule.threats as IMitreEnterpriseAttack[],
        }
      : null;
  const scheduleRuleData: ScheduleStepRuleJson | null =
    rule != null
      ? {
          ...pick(['enabled', 'interval'], rule),
          from: rule.meta.from,
        }
      : null;

  return { aboutRuleData, defineRuleData, scheduleRuleData };
};
