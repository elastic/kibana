/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const apm_transaction_rate = {
  ruleParams: {
    consumer: 'apm',
    name: 'apm_failed_transaction_rate_threshold',
    ruleTypeId: 'apm.transaction_error_rate',
    params: {
      threshold: 30,
      windowSize: 5,
      windowUnit: 'm',
      transactionType: undefined,
      serviceName: undefined,
      environment: 'ENVIRONMENT_ALL',
      searchConfiguration: {
        query: {
          query: `service.environment: "rule-test"`,
          language: 'kuery',
        },
      },
      groupBy: ['service.name', 'service.environment', 'transaction.type'],
      useKqlFilter: true,
    },
  },
};
