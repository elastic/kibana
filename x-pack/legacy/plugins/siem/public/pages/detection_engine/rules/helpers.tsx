/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import { get, pick } from 'lodash/fp';
import moment from 'moment';
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
  rule: Rule;
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
          ...pick(['description', 'name', 'references', 'severity', 'tags', 'threat'], rule),
          ...(detailsView ? { name: '' } : {}),
          threat: rule.threat as IMitreEnterpriseAttack[],
          falsePositives: rule.false_positives,
          riskScore: rule.risk_score,
          timeline: {
            id: rule.timeline_id ?? null,
            title: rule.timeline_title ?? null,
          },
        }
      : null;

  const from = dateMath.parse(rule.from) ?? moment();
  const interval = dateMath.parse(`now-${rule.interval}`) ?? moment();

  const fromDuration = moment.duration(interval.diff(from));
  let fromHumanize = `${Math.floor(fromDuration.asHours())}h`;

  if (fromDuration.asSeconds() < 60) {
    fromHumanize = `${Math.floor(fromDuration.asSeconds())}s`;
  } else if (fromDuration.asMinutes() < 60) {
    fromHumanize = `${Math.floor(fromDuration.asMinutes())}m`;
  }

  const scheduleRuleData: ScheduleStepRule | null =
    rule != null
      ? {
          isNew: false,
          ...pick(['enabled', 'interval'], rule),
          from: fromHumanize,
        }
      : null;

  return { aboutRuleData, defineRuleData, scheduleRuleData };
};

export const useQuery = () => new URLSearchParams(useLocation().search);

export type PrePackagedRuleStatus =
  | 'ruleInstalled'
  | 'ruleNotInstalled'
  | 'ruleNeedUpdate'
  | 'someRuleUninstall'
  | 'unknown';

export const getPrePackagedRuleStatus = (
  rulesInstalled: number | null,
  rulesNotInstalled: number | null,
  rulesNotUpdated: number | null
): PrePackagedRuleStatus => {
  if (
    rulesNotInstalled != null &&
    rulesInstalled === 0 &&
    rulesNotInstalled > 0 &&
    rulesNotUpdated === 0
  ) {
    return 'ruleNotInstalled';
  } else if (
    rulesInstalled != null &&
    rulesInstalled > 0 &&
    rulesNotInstalled === 0 &&
    rulesNotUpdated === 0
  ) {
    return 'ruleInstalled';
  } else if (
    rulesInstalled != null &&
    rulesNotInstalled != null &&
    rulesInstalled > 0 &&
    rulesNotInstalled > 0 &&
    rulesNotUpdated === 0
  ) {
    return 'someRuleUninstall';
  } else if (
    rulesInstalled != null &&
    rulesNotInstalled != null &&
    rulesNotUpdated != null &&
    rulesInstalled > 0 &&
    rulesNotInstalled >= 0 &&
    rulesNotUpdated > 0
  ) {
    return 'ruleNeedUpdate';
  }
  return 'unknown';
};
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

export const redirectToDetections = (
  isSignalIndexExists: boolean | null,
  isAuthenticated: boolean | null,
  hasEncryptionKey: boolean | null
) =>
  isSignalIndexExists != null &&
  isAuthenticated != null &&
  hasEncryptionKey != null &&
  (!isSignalIndexExists || !isAuthenticated || !hasEncryptionKey);
