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

// Real inventory from this instance: the `aws` package's 33 policy templates
// plus the standalone aws_* packages (incl. OpenTelemetry variants), grouped
// by AWS product category.
export const AWS_SERVICE_CATEGORIES: AwsServiceCategory[] = [
  {
    id: 'security',
    label: 'Security, Identity and Compliance',
    services: [
      { id: 'cloudtrail', name: 'AWS CloudTrail', dataTypes: ['Logs'] },
      { id: 'cloudtrail_otel', name: 'AWS CloudTrail (OTel)', dataTypes: ['Logs'], beta: true },
      { id: 'config', name: 'AWS Config', dataTypes: ['Metrics'] },
      { id: 'guardduty', name: 'Amazon GuardDuty', dataTypes: ['Logs', 'Metrics'] },
      { id: 'inspector', name: 'Amazon Inspector', dataTypes: ['Metrics'] },
      { id: 'securityhub', name: 'AWS Security Hub', dataTypes: ['Logs'] },
      { id: 'securityhub_cspm', name: 'AWS Security Hub CSPM', dataTypes: ['Metrics'] },
      { id: 'security_lake', name: 'Amazon Security Lake', dataTypes: ['Logs'] },
      { id: 'waf', name: 'AWS WAF', dataTypes: ['Logs'] },
      { id: 'waf_otel', name: 'AWS WAF (OTel)', dataTypes: ['Logs'], beta: true },
      { id: 'firewall', name: 'AWS Network Firewall', dataTypes: ['Logs', 'Metrics'] },
    ],
  },
  {
    id: 'compute',
    label: 'Compute Services',
    services: [
      { id: 'ec2', name: 'Amazon EC2', dataTypes: ['Logs', 'Metrics'] },
      { id: 'ec2_otel', name: 'Amazon EC2 (OTel)', dataTypes: ['Metrics'], beta: true },
      { id: 'lambda', name: 'AWS Lambda', dataTypes: ['Logs', 'Metrics'] },
      { id: 'lambda_otel', name: 'AWS Lambda (OTel)', dataTypes: ['Metrics'], beta: true },
      { id: 'ecs', name: 'Amazon ECS', dataTypes: ['Metrics'] },
      { id: 'ecs_otel', name: 'Amazon ECS (OTel)', dataTypes: ['Metrics'], beta: true },
      { id: 'fargate', name: 'AWS Fargate', dataTypes: ['Metrics'] },
      { id: 'emr', name: 'Amazon EMR', dataTypes: ['Logs', 'Metrics'] },
    ],
  },
  {
    id: 'networking',
    label: 'Networking and Content Delivery',
    services: [
      { id: 'vpcflow', name: 'Amazon VPC', dataTypes: ['Logs'] },
      { id: 'vpcflow_otel', name: 'Amazon VPC Flow (OTel)', dataTypes: ['Logs'], beta: true },
      { id: 'vpn', name: 'Amazon VPN', dataTypes: ['Metrics'] },
      { id: 'natgateway', name: 'Amazon NAT Gateway', dataTypes: ['Metrics'] },
      { id: 'transitgateway', name: 'AWS Transit Gateway', dataTypes: ['Metrics'] },
      { id: 'elb', name: 'AWS ELB', dataTypes: ['Logs', 'Metrics'] },
      { id: 'elb_logs_otel', name: 'AWS ELB Logs (OTel)', dataTypes: ['Logs'], beta: true },
      { id: 'elb_metrics_otel', name: 'AWS ELB Metrics (OTel)', dataTypes: ['Metrics'], beta: true },
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
      { id: 'rds_otel', name: 'Amazon RDS (OTel)', dataTypes: ['Metrics'], beta: true },
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
      { id: 'sqs_otel', name: 'Amazon SQS (OTel)', dataTypes: ['Metrics'], beta: true },
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
      { id: 'cloudwatch_otel', name: 'AWS CloudWatch (OTel)', dataTypes: ['Logs', 'Metrics'], beta: true },
      { id: 'awshealth', name: 'AWS Health', dataTypes: ['Metrics'] },
      { id: 'custom_logs', name: 'Custom AWS Logs', dataTypes: ['Logs'] },
    ],
  },
];
