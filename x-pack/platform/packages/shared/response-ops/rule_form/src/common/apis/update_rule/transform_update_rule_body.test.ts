/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeParams } from '../../types';
import { transformUpdateRuleBody } from './transform_update_rule_body';
import type { UpdateRuleBody } from './types';

const ruleToUpdate: UpdateRuleBody<RuleTypeParams> = {
  params: {
    aggType: 'count',
    termSize: 5,
    thresholdComparator: '>',
    timeWindowSize: 5,
    timeWindowUnit: 'm',
    groupBy: 'all',
    threshold: [1000],
    index: ['.kibana'],
    timeField: 'alert.executionStatus.lastExecutionDate',
  },
  schedule: { interval: '1m' },
  tags: [],
  name: 'test',
  throttle: null,
  actions: [
    {
      group: 'threshold met',
      id: '83d4d860-9316-11eb-a145-93ab369a4461',
      params: {
        level: 'info',
        message: 'test-message',
      },
      actionTypeId: '.server-log',
      frequency: {
        notifyWhen: 'onActionGroupChange',
        throttle: null,
        summary: false,
      },
      useAlertDataForTemplate: true,
    },
    {
      id: '.test-system-action',
      params: {},
      actionTypeId: '.system-action',
    },
  ],
  notifyWhen: 'onActionGroupChange',
  alertDelay: {
    active: 10,
  },
  flapping: {
    enabled: true,
    lookBackWindow: 10,
    statusChangeThreshold: 10,
  },
};

describe('transformUpdateRuleBody', () => {
  test('should transform update rule body', () => {
    expect(transformUpdateRuleBody(ruleToUpdate)).toEqual({
      actions: [
        {
          frequency: {
            notify_when: 'onActionGroupChange',
            summary: false,
            throttle: null,
          },
          group: 'threshold met',
          id: '83d4d860-9316-11eb-a145-93ab369a4461',
          params: {
            level: 'info',
            message: 'test-message',
          },
          use_alert_data_for_template: true,
        },
        {
          id: '.test-system-action',
          params: {},
        },
      ],
      alert_delay: {
        active: 10,
      },
      name: 'test',
      notifyWhen: 'onActionGroupChange',
      params: {
        aggType: 'count',
        groupBy: 'all',
        index: ['.kibana'],
        termSize: 5,
        threshold: [1000],
        thresholdComparator: '>',
        timeField: 'alert.executionStatus.lastExecutionDate',
        timeWindowSize: 5,
        timeWindowUnit: 'm',
      },
      schedule: {
        interval: '1m',
      },
      tags: [],
      throttle: null,
      flapping: {
        enabled: true,
        look_back_window: 10,
        status_change_threshold: 10,
      },
    });
  });
});
