/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';

interface SandboxProps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

function mockRuleType() {
  return {
    id: 'test.testRuleType',
    name: 'My Test Rule Type',
    actionGroups: [{ id: 'default', name: 'Default Action Group' }],
    actionVariables: {
      context: [],
      state: [],
      params: [],
    },
    defaultActionGroupId: 'default',
    recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
    authorizedConsumers: {},
    producer: 'rules',
    minimumLicenseRequired: 'basic',
    enabledInLicense: true,
  };
}

function mockRuleSummary() {
  return {
    id: 'rule-id',
    name: 'rule-name',
    tags: ['tag-1', 'tag-2'],
    ruleTypeId: 'test',
    consumer: 'rule-consumer',
    status: 'OK',
    muteAll: false,
    throttle: '',
    enabled: true,
    errorMessages: [],
    statusStartDate: '2022-03-21T07:40:46-07:00',
    statusEndDate: '2022-03-25T07:40:46-07:00',
    alerts: {
      foo: {
        status: 'OK',
        muted: false,
        actionGroupId: 'testActionGroup',
      },
    },
    executionDuration: {
      average: 100,
      valuesWithTimestamp: {},
    },
  };
}

export const RuleEventLogListSandbox = ({ triggersActionsUi }: SandboxProps) => {
  const componenProps: any = {
    rule: {
      id: 'test',
    },
    ruleType: mockRuleType(),
    ruleSummary: mockRuleSummary(),
    numberOfExecutions: 60,
    onChangeDuration: (duration: number) => {},
    customLoadExecutionLogAggregations: async () => ({
      total: 1,
      data: [
        {
          id: 'f1c924a4-dd09-4e7d-af5d-7e1efaf51034',
          timestamp: '2022-05-09T04:59:33.455Z',
          duration_ms: 77,
          status: 'success',
          message: "rule executed: .index-threshold:d01a26a0-cf54-11ec-a81f-15728a517061: 'test'",
          num_active_alerts: 0,
          num_new_alerts: 0,
          num_recovered_alerts: 0,
          num_triggered_actions: 0,
          num_generated_actions: 0,
          num_succeeded_actions: 0,
          num_errored_actions: 0,
          total_search_duration_ms: 11,
          es_search_duration_ms: 2,
          schedule_delay_ms: 1274,
          timed_out: false,
        },
      ],
      totalErrors: 0,
      errors: [],
    }),
  };

  return (
    <div style={{ height: '400px' }}>{triggersActionsUi.getRuleEventLogList(componenProps)}</div>
  );
};
