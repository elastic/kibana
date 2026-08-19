/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type AwsDataType = 'Logs' | 'Metrics';

export interface AwsServiceEntry {
  id: string;
  name: string;
  dataTypes: AwsDataType[];
  beta?: boolean;
}

export interface AwsServiceCategory {
  id: string;
  label: string;
  services: AwsServiceEntry[];
}

// Global data-format choice, set once in Step 1 and applied everywhere
// downstream (which package variant installs, which CloudFormation template
// the Elastic Cloud Forwarder card launches, which prebuilt content shows on
// Detect & Review). Kept out of the main Step 1 view per the design
// discussion — most users should never need to touch it.
export type AwsSchema = 'ecs' | 'otel';

export const AWS_SCHEMA_META: Record<AwsSchema, { label: string; description: string }> = {
  ecs: {
    label: 'ECS-compatible',
    description: 'Elastic Common Schema field mappings — the default, broadest content coverage.',
  },
  otel: {
    label: 'OTel-native',
    description: 'OpenTelemetry semantic conventions. Some services have limited content today.',
  },
};

// Example (non-CloudFormation) services surfaced under Managed Integrations
// on steps 4 and 5 — demo data for the prototype.
export const MANAGED_INTEGRATION_EXAMPLES = [
  'Amazon RDS',
  'Amazon S3',
  'Amazon SQS',
  'Amazon SNS',
  'AWS Billing',
  'Amazon DynamoDB',
];

// Real inventory from this instance: the `aws` package's 33 policy templates
// plus the standalone aws_* packages (incl. OpenTelemetry variants), grouped
// by AWS product category.
export const AWS_SERVICE_CATEGORIES: AwsServiceCategory[] = [
  {
    id: 'security',
    label: 'Security, Identity and Compliance',
    services: [
      { id: 'cloudtrail', name: 'AWS CloudTrail', dataTypes: ['Logs'] },
      { id: 'config', name: 'AWS Config', dataTypes: ['Metrics'] },
      { id: 'guardduty', name: 'Amazon GuardDuty', dataTypes: ['Logs', 'Metrics'] },
      { id: 'inspector', name: 'Amazon Inspector', dataTypes: ['Metrics'] },
      { id: 'securityhub', name: 'AWS Security Hub', dataTypes: ['Logs'] },
      { id: 'securityhub_cspm', name: 'AWS Security Hub CSPM', dataTypes: ['Metrics'] },
      { id: 'security_lake', name: 'Amazon Security Lake', dataTypes: ['Logs'] },
      { id: 'waf', name: 'AWS WAF', dataTypes: ['Logs'] },
      { id: 'firewall', name: 'AWS Network Firewall', dataTypes: ['Logs', 'Metrics'] },
    ],
  },
  {
    id: 'compute',
    label: 'Compute Services',
    services: [
      { id: 'ec2', name: 'Amazon EC2', dataTypes: ['Logs', 'Metrics'] },
      { id: 'lambda', name: 'AWS Lambda', dataTypes: ['Logs', 'Metrics'] },
      { id: 'ecs', name: 'Amazon ECS', dataTypes: ['Metrics'] },
      { id: 'fargate', name: 'AWS Fargate', dataTypes: ['Metrics'] },
      { id: 'emr', name: 'Amazon EMR', dataTypes: ['Logs', 'Metrics'] },
    ],
  },
  {
    id: 'networking',
    label: 'Networking and Content Delivery',
    services: [
      { id: 'vpcflow', name: 'Amazon VPC', dataTypes: ['Logs'] },
      { id: 'vpn', name: 'Amazon VPN', dataTypes: ['Metrics'] },
      { id: 'natgateway', name: 'Amazon NAT Gateway', dataTypes: ['Metrics'] },
      { id: 'transitgateway', name: 'AWS Transit Gateway', dataTypes: ['Metrics'] },
      { id: 'elb', name: 'AWS ELB', dataTypes: ['Logs', 'Metrics'] },
      { id: 'route53', name: 'AWS Route 53', dataTypes: ['Logs'] },
      { id: 'cloudfront', name: 'Amazon CloudFront', dataTypes: ['Logs'] },
      { id: 'apigateway', name: 'AWS API Gateway', dataTypes: ['Logs', 'Metrics'] },
    ],
  },
  {
    id: 'storage',
    label: 'Storage Solutions',
    services: [
      { id: 's3', name: 'Amazon S3', dataTypes: ['Logs', 'Metrics'] },
      { id: 's3_storage_lens', name: 'Amazon S3 Storage Lens', dataTypes: ['Metrics'] },
      { id: 'ebs', name: 'Amazon EBS', dataTypes: ['Metrics'] },
    ],
  },
  {
    id: 'database',
    label: 'Database Services',
    services: [
      { id: 'rds', name: 'Amazon RDS', dataTypes: ['Metrics'] },
      { id: 'dynamodb', name: 'Amazon DynamoDB', dataTypes: ['Metrics'] },
      { id: 'redshift', name: 'Amazon Redshift', dataTypes: ['Metrics'] },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics and Streaming',
    services: [
      { id: 'kinesis', name: 'Amazon Kinesis Data Stream', dataTypes: ['Metrics'] },
      { id: 'kafka', name: 'Amazon MSK (Kafka)', dataTypes: ['Metrics'] },
      { id: 'firehose', name: 'Amazon Data Firehose', dataTypes: ['Logs'] },
    ],
  },
  {
    id: 'app_integration',
    label: 'Application Integration',
    services: [
      { id: 'sns', name: 'Amazon SNS', dataTypes: ['Metrics'] },
      { id: 'sqs', name: 'Amazon SQS', dataTypes: ['Metrics'] },
      { id: 'mq', name: 'Amazon MQ', dataTypes: ['Metrics'] },
    ],
  },
  {
    id: 'ml',
    label: 'Machine Learning',
    services: [
      { id: 'bedrock', name: 'Amazon Bedrock', dataTypes: ['Logs', 'Metrics'] },
      { id: 'bedrock_agentcore', name: 'Amazon Bedrock AgentCore', dataTypes: ['Logs', 'Metrics'], beta: true },
    ],
  },
  {
    id: 'cost',
    label: 'Cost Management',
    services: [
      { id: 'billing', name: 'AWS Billing', dataTypes: ['Metrics'] },
      { id: 'usage', name: 'AWS Usage', dataTypes: ['Metrics'] },
      { id: 'cur', name: 'AWS Cost and Usage Report (CUR 2.0)', dataTypes: ['Metrics'], beta: true },
    ],
  },
  {
    id: 'management',
    label: 'Management and Monitoring',
    services: [
      { id: 'cloudwatch', name: 'AWS CloudWatch', dataTypes: ['Logs', 'Metrics'] },
      { id: 'awshealth', name: 'AWS Health', dataTypes: ['Metrics'] },
      { id: 'custom_logs', name: 'Custom AWS Logs', dataTypes: ['Logs'] },
    ],
  },
];
