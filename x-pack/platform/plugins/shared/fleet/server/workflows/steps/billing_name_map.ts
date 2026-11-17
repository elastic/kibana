/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The keys are AWS Cost Explorer `SERVICE` dimension values as returned in `servicesInUse`.
 * Names were checked against the AWS Price List `servicename` attribute and, where available,
 * a real account's Cost Explorer output (the two can differ, as EC2 and ELB show).
 * Names that are not listed here are reported as unmatched, not unsupported.
 */
export const BILLING_NAME_TO_SERVICE_ID: Record<string, string> = {
  AmazonCloudWatch: 'cloudwatch',
  'AWS Config': 'config',
  'Amazon DynamoDB': 'dynamodb',
  'Amazon Elastic Compute Cloud - Compute': 'ec2',
  'Amazon Elastic Container Service': 'ecs',
  'Amazon Elastic Container Service for Kubernetes': 'eks',
  'Amazon Elastic Load Balancing': 'elb',
  'Elastic Load Balancing': 'elb',
  'AWS Network Firewall': 'firewall',
  'Amazon GuardDuty': 'guardduty',
  'Amazon Inspector': 'inspector',
  'Amazon Kinesis': 'kinesis',
  'AWS Lambda': 'lambda',
  'Amazon Relational Database Service': 'rds',
  'Amazon Redshift': 'redshift',
  'Amazon Simple Storage Service': 's3',
  'Amazon Simple Notification Service': 'sns',
  'Amazon Simple Queue Service': 'sqs',
};
