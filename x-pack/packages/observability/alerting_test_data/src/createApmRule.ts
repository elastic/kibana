/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRule } from './create_rule';

export const createApmRule = async (
  actionId: string,
  ruleParams: {
    consumer?: string;
    name?: string;
    ruleTypeId?: string;
    params?: {
      threshold?: number;
      windowSize?: number;
      windowUnit?: string;
      transactionType?: string;
      serviceName?: string;
      environment?: string;
      searchConfiguration: {
        query: {
          query?: string;
          language?: string;
        };
      };
      groupBy?: string[];
      useKqlFilter?: boolean;
    };
  }) => {
  const apmErrorRateRuleParams = {
    tags: ['apm'],
    consumer: ruleParams.consumer || 'apm',
    name: ruleParams.name || 'Default APM rule name',
    rule_type_id: ruleParams.ruleTypeId || 'apm.transaction_error_rate',
    params: {
      threshold: ruleParams.params?.threshold || 30,
      windowSize: ruleParams.params?.windowSize || 5,
      windowUnit: ruleParams.params?.windowUnit || 'm',
      transactionType: ruleParams.params?.transactionType || undefined,
      serviceName: ruleParams.params?.serviceName || undefined,
      environment: ruleParams.params?.environment || 'ENVIRONMENT_ALL',
      searchConfiguration: {
        query: {
          query: ruleParams.params?.searchConfiguration.query.query || '',
          language: ruleParams.params?.searchConfiguration.query.language || 'kuery',
        },
      },
      groupBy: ruleParams.params?.groupBy || ['service.name', 'service.environment', 'transaction.type'],
      useKqlFilter: ruleParams.params?.useKqlFilter || true,
    },
    actions: [
      {
        group: 'threshold_met',
        id: actionId,
        params: {
          documents: [
            {
              ruleName: '{{rule.name}}',
              alertDetailsUrl: '{{context.alertDetailsUrl}}',
              environment: '{{context.environment}}',
              interval: '{{context.interval}}',
              reason: '{{context.reason}}',
              serviceName: '{{context.serviceName}}',
              threshold: '{{context.threshold}}',
              transactionName: '{{context.transactionName}}',
              transactionType: '{{context.transactionType}}',
              triggerValue: '{{context.triggerValue}}',
              viewInAppUrl: '{{context.viewInAppUrl}}',
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

  return createRule(apmErrorRateRuleParams);
};
