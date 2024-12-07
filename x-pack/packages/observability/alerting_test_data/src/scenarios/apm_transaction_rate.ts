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
    rule_type_id: 'apm.transaction_error_rate',
    params: {
      threshold: 30,
      windowSize: 1,
      windowUnit: 'h',
      transactionType: undefined,
      serviceName: undefined,
      environment: 'ENVIRONMENT_ALL',
      searchConfiguration: {
        query: {
          query: ``,
          language: 'kuery',
        },
      },
      groupBy: ['service.name', 'service.environment', 'transaction.type'],
      useKqlFilter: true,
    },
  },
};
