/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { has, isEmpty } from 'lodash/fp';
import moment from 'moment';

import { NewRule, RuleType } from '../../../../containers/detection_engine/rules';

import {
  AboutStepRule,
  DefineStepRule,
  ScheduleStepRule,
  DefineStepRuleJson,
  ScheduleStepRuleJson,
  AboutStepRuleJson,
} from '../types';
import { isMlRule } from '../helpers';

export const getTimeTypeValue = (time: string): { unit: string; value: number } => {
  const timeObj = {
    unit: '',
    value: 0,
  };
  const filterTimeVal = (time as string).match(/\d+/g);
  const filterTimeType = (time as string).match(/[a-zA-Z]+/g);
  if (!isEmpty(filterTimeVal) && filterTimeVal != null && !isNaN(Number(filterTimeVal[0]))) {
    timeObj.value = Number(filterTimeVal[0]);
  }
  if (
    !isEmpty(filterTimeType) &&
    filterTimeType != null &&
    ['s', 'm', 'h'].includes(filterTimeType[0])
  ) {
    timeObj.unit = filterTimeType[0];
  }
  return timeObj;
};

interface RuleFields {
  anomalyThreshold: unknown;
  mlJobId: unknown;
  queryBar: unknown;
  index: unknown;
  ruleType: unknown;
}
type QueryRuleFields<T> = Omit<T, 'anomalyThreshold' | 'mlJobId'>;
type MlRuleFields<T> = Omit<T, 'queryBar' | 'index'>;

const isMlFields = <T>(fields: QueryRuleFields<T> | MlRuleFields<T>): fields is MlRuleFields<T> =>
  has('anomalyThreshold', fields);

export const filterRuleFieldsForType = <T extends RuleFields>(fields: T, type: RuleType) => {
  if (isMlRule(type)) {
    const { index, queryBar, ...mlRuleFields } = fields;
    return mlRuleFields;
  } else {
    const { anomalyThreshold, mlJobId, ...queryRuleFields } = fields;
    return queryRuleFields;
  }
};

export const formatDefineStepData = (defineStepData: DefineStepRule): DefineStepRuleJson => {
  const ruleFields = filterRuleFieldsForType(defineStepData, defineStepData.ruleType);

  if (isMlFields(ruleFields)) {
    const { anomalyThreshold, mlJobId, isNew, ruleType, ...rest } = ruleFields;
    return {
      ...rest,
      type: ruleType,
      anomaly_threshold: anomalyThreshold,
      machine_learning_job_id: mlJobId,
    };
  } else {
    const { queryBar, isNew, ruleType, ...rest } = ruleFields;
    return {
      ...rest,
      type: ruleType,
      filters: queryBar?.filters,
      language: queryBar?.query?.language,
      query: queryBar?.query?.query as string,
      saved_id: queryBar?.saved_id,
      ...(ruleType === 'query' && queryBar?.saved_id ? { type: 'saved_query' as RuleType } : {}),
    };
  }
};

export const formatScheduleStepData = (scheduleData: ScheduleStepRule): ScheduleStepRuleJson => {
  const { isNew, ...formatScheduleData } = scheduleData;
  if (!isEmpty(formatScheduleData.interval) && !isEmpty(formatScheduleData.from)) {
    const { unit: intervalUnit, value: intervalValue } = getTimeTypeValue(
      formatScheduleData.interval
    );
    const { unit: fromUnit, value: fromValue } = getTimeTypeValue(formatScheduleData.from);
    const duration = moment.duration(intervalValue, intervalUnit as 's' | 'm' | 'h');
    duration.add(fromValue, fromUnit as 's' | 'm' | 'h');
    formatScheduleData.from = `now-${duration.asSeconds()}s`;
    formatScheduleData.to = 'now';
  }
  return {
    ...formatScheduleData,
    meta: {
      from: scheduleData.from,
    },
  };
};

export const formatAboutStepData = (aboutStepData: AboutStepRule): AboutStepRuleJson => {
  const {
    falsePositives,
    references,
    riskScore,
    threat,
    timeline,
    isNew,
    note,
    ...rest
  } = aboutStepData;
  return {
    false_positives: falsePositives.filter(item => !isEmpty(item)),
    references: references.filter(item => !isEmpty(item)),
    risk_score: riskScore,
    ...(timeline.id != null && timeline.title != null
      ? {
          timeline_id: timeline.id,
          timeline_title: timeline.title,
        }
      : {}),
    threat: threat
      .filter(singleThreat => singleThreat.tactic.name !== 'none')
      .map(singleThreat => ({
        ...singleThreat,
        framework: 'MITRE ATT&CK',
        technique: singleThreat.technique.map(technique => {
          const { id, name, reference } = technique;
          return { id, name, reference };
        }),
      })),
    ...(!isEmpty(note) ? { note } : {}),
    ...rest,
  };
};

export const formatRule = (
  defineStepData: DefineStepRule,
  aboutStepData: AboutStepRule,
  scheduleData: ScheduleStepRule
): NewRule => ({
  ...formatDefineStepData(defineStepData),
  ...formatAboutStepData(aboutStepData),
  ...formatScheduleStepData(scheduleData),
});
