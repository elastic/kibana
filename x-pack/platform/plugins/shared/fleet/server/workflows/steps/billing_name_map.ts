/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AWS Cost Explorer service names (as returned in `servicesInUse`) to catalog service ids.
 * Billing names that are not listed here are reported as unmatched.
 */
export const BILLING_NAME_TO_SERVICE_ID: Record<string, string> = {
  'Amazon GuardDuty': 'guardduty',
  'Amazon Elastic Compute Cloud - Compute': 'ec2',
  'AWS Lambda': 'lambda',
  'Amazon Simple Storage Service': 's3',
  'Amazon Relational Database Service': 'rds',
};
