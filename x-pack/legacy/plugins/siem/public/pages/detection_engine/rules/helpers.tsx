/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import { get } from 'lodash/fp';
import moment from 'moment';
import { useLocation } from 'react-router-dom';

import { Filter } from '../../../../../../../../src/plugins/data/public';
import { Rule } from '../../../containers/detection_engine/rules';
import { FormData, FormHook, FormSchema } from '../../../shared_imports';
import {
  AboutStepRule,
  AboutStepRuleDetails,
  DefineStepRule,
  IMitreEnterpriseAttack,
  ScheduleStepRule,
} from './types';

export interface GetStepsData {
  aboutRuleData: AboutStepRule;
  modifiedAboutRuleDetailsData: AboutStepRuleDetails;
  defineRuleData: DefineStepRule;
  scheduleRuleData: ScheduleStepRule;
}

export const getStepsData = ({
  rule,
  detailsView = false,
}: {
  rule: Rule;
  detailsView?: boolean;
}): GetStepsData => {
  const defineRuleData: DefineStepRule = getDefineStepsData(rule);
  const aboutRuleData: AboutStepRule = getAboutStepsData(rule, detailsView);
  const modifiedAboutRuleDetailsData: AboutStepRuleDetails = getModifiedAboutDetailsData(rule);
  const scheduleRuleData: ScheduleStepRule = getScheduleStepsData(rule);

  return { aboutRuleData, modifiedAboutRuleDetailsData, defineRuleData, scheduleRuleData };
};

export const getDefineStepsData = (rule: Rule): DefineStepRule => {
  const { index, query, language, filters, saved_id: savedId } = rule;

  return {
    isNew: false,
    index,
    queryBar: {
      query: {
        query,
        language,
      },
      filters: filters as Filter[],
      saved_id: savedId ?? null,
    },
  };
};

export const getScheduleStepsData = (rule: Rule): ScheduleStepRule => {
  const { enabled, interval, from } = rule;
  const fromHumanizedValue = getHumanizedDuration(from, interval);

  return {
    isNew: false,
    enabled,
    interval,
    from: fromHumanizedValue,
  };
};

export const getHumanizedDuration = (from: string, interval: string): string => {
  const fromValue = dateMath.parse(from) ?? moment();
  const intervalValue = dateMath.parse(`now-${interval}`) ?? moment();

  const fromDuration = moment.duration(intervalValue.diff(fromValue));
  const fromHumanize = `${Math.floor(fromDuration.asHours())}h`;

  if (fromDuration.asSeconds() < 60) {
    return `${Math.floor(fromDuration.asSeconds())}s`;
  } else if (fromDuration.asMinutes() < 60) {
    return `${Math.floor(fromDuration.asMinutes())}m`;
  }

  return fromHumanize;
};

export const getAboutStepsData = (rule: Rule, detailsView: boolean): AboutStepRule => {
  const { name, description, note } = determineDetailsValue(rule, detailsView);
  const {
    references,
    severity,
    false_positives: falsePositives,
    risk_score: riskScore,
    tags,
    threat,
    timeline_id: timelineId,
    timeline_title: timelineTitle,
  } = rule;

  return {
    isNew: false,
    name,
    description,
    note: note!,
    references,
    severity,
    tags,
    riskScore,
    falsePositives,
    threat: threat as IMitreEnterpriseAttack[],
    timeline: {
      id: timelineId ?? null,
      title: timelineTitle ?? null,
    },
  };
};

export const determineDetailsValue = (
  rule: Rule,
  detailsView: boolean
): Pick<Rule, 'name' | 'description' | 'note'> => {
  const { name, description, note } = rule;
  if (detailsView) {
    return { name: '', description: '', note: '' };
  }

  return { name, description, note: note ?? '' };
};

export const getModifiedAboutDetailsData = (rule: Rule): AboutStepRuleDetails => ({
  note: rule.note ?? '',
  description: rule.description,
});

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
