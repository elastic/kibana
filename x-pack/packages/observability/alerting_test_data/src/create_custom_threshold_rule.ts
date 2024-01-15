/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Aggregators,
  Comparator,
} from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { FIRED_ACTIONS_ID } from './constants';
import { createRule } from './create_rule';

export const createCustomThresholdRule = async (
  actionId: string,
  dataViewId: string,
  ruleParams: {
    consumer?: string;
    name?: string;
    params?: {
      criteria: any[];
      groupBy?: string[];
      searchConfiguration: {
        query: {
          query?: string;
        };
      };
    };
  }
) => {
  const customThresholdRuleParams = {
    tags: ['observability'],
    consumer: ruleParams.consumer || 'logs',
    name: ruleParams.name || 'Default custom threshold rule name',
    rule_type_id: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
    params: {
      criteria: ruleParams.params?.criteria || [
        {
          comparator: Comparator.GT,
          threshold: [1],
          timeSize: 1,
          timeUnit: 'm',
          metrics: [{ name: 'A', filter: '', aggType: Aggregators.COUNT }],
        },
      ],
      groupBy: ruleParams.params?.groupBy,
      alertOnNoData: true,
      alertOnGroupDisappear: true,
      searchConfiguration: {
        query: {
          query: ruleParams.params?.searchConfiguration.query.query || '',
          language: 'kuery',
        },
        index: dataViewId,
      },
    },
    actions: [
      {
        group: FIRED_ACTIONS_ID,
        id: actionId,
        params: {
          documents: [
            {
              ruleName: '{{rule.name}}',
              ruleType: '{{rule.type}}',
              alertDetailsUrl: '{{context.alertDetailsUrl}}',
              reason: '{{context.reason}}',
              value: '{{context.value}}',
              host: '{{context.host}}',
            },
          ],
        },
        frequency: {
          notify_when: 'onActionGroupChange',
          throttle: null,
          summary: false,
        },
      },
    ],
    schedule: {
      interval: '1m',
    },
  };

  return createRule(customThresholdRuleParams);
};
