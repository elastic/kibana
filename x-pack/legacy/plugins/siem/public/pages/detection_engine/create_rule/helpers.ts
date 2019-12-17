/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import moment from 'moment';

import { NewRule } from '../../../containers/detection_engine/rules/types';

import {
  AboutStepRule,
  DefineStepRule,
  ScheduleStepRule,
  DefineStepRuleJson,
  ScheduleStepRuleJson,
  AboutStepRuleJson,
  FormatRuleType,
} from './types';

const getTimeTypeValue = (time: string): { unit: string; value: number } => {
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

const formatDefineStepData = (defineStepData: DefineStepRule): DefineStepRuleJson => {
  const { queryBar, useIndicesConfig, ...rest } = defineStepData;
  const { filters, query, saved_id: savedId } = queryBar;
  return {
    ...rest,
    language: query.language,
    filters,
    query: query.query as string,
    ...(savedId != null ? { saved_id: savedId } : {}),
  };
};

const formatScheduleStepData = (scheduleData: ScheduleStepRule): ScheduleStepRuleJson => {
  const formatScheduleData = scheduleData;

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
  return formatScheduleData;
};

const formatAboutStepData = (aboutStepData: AboutStepRule): AboutStepRuleJson => {
  const { falsePositives, references, riskScore, threats, ...rest } = aboutStepData;

  return {
    false_positives: falsePositives.filter(item => !isEmpty(item)),
    references: references.filter(item => !isEmpty(item)),
    risk_score: riskScore,
    threats: threats
      .filter(threat => threat.tactic.name !== 'none')
      .map(threat => ({
        ...threat,
        framework: 'MITRE ATT&CK',
        techniques: threat.techniques.map(technique => {
          const { id, name, reference } = technique;
          return { id, name, reference };
        }),
      })),
    ...rest,
  };
};

export const formatRule = (
  defineStepData: DefineStepRule,
  aboutStepData: AboutStepRule,
  scheduleData: ScheduleStepRule
): NewRule => {
  const type: FormatRuleType = defineStepData.queryBar.saved_id != null ? 'saved_query' : 'query';
  const persistData = {
    type,
    ...formatDefineStepData(defineStepData),
    ...formatAboutStepData(aboutStepData),
    ...formatScheduleStepData(scheduleData),
    meta: {
      from: scheduleData.from,
    },
  };

  return persistData;
};
