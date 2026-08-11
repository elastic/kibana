/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Real installable content shipped for AWS, verified against the `aws`
// integration package (github.com/elastic/integrations, 53 dashboards /
// 13 saved searches / 8 alerting rule templates) and epr.elastic.co
// (`?type=content` — the per-service OTel content packages, all beta).
// Services without prebuilt content simply don't appear on step 5.

export interface AwsContentItem {
  id: string;
  title: string;
  type: 'dashboard' | 'search' | 'alert_rule' | 'content_package';
  description?: string;
}

// Package-wide content that isn't tied to a single service.
export const GENERAL_CONTENT: AwsContentItem[] = [
  { id: 'aws-overview', title: '[Metrics AWS] Overview', type: 'dashboard' },
];

export const CONTENT_BY_SERVICE: Record<string, AwsContentItem[]> = {
  cloudtrail: [{ id: 'ct-dash', title: '[Logs AWS] CloudTrail', type: 'dashboard' }],
  cloudtrail_otel: [
    {
      id: 'ct-otel-pkg',
      title: 'AWS CloudTrail Logs OpenTelemetry Assets',
      type: 'content_package',
      description: 'beta',
    },
  ],
  config: [{ id: 'config-dash', title: '[Logs AWS] Config', type: 'dashboard' }],
  guardduty: [
    { id: 'gd-overview', title: '[Logs AWS] Guardduty Findings Overview', type: 'dashboard' },
    { id: 'gd-severity', title: '[Logs AWS] Guardduty Findings Severity', type: 'dashboard' },
    { id: 'gd-threat', title: '[Logs AWS] Guardduty Findings Threat', type: 'dashboard' },
  ],
  inspector: [
    { id: 'insp-dash', title: '[Logs AWS] Inspector Findings Overview', type: 'dashboard' },
  ],
  securityhub_cspm: [
    {
      id: 'cspm-dash',
      title: '[Logs AWS] Security Hub CSPM Summary Dashboard',
      type: 'dashboard',
    },
  ],
  waf: [{ id: 'waf-dash', title: '[Logs AWS] WAF Log Overview', type: 'dashboard' }],
  waf_otel: [
    {
      id: 'waf-otel-pkg',
      title: 'AWS WAF Logs OpenTelemetry Assets',
      type: 'content_package',
      description: 'beta',
    },
  ],
  firewall: [
    { id: 'fw-overview', title: '[Logs AWS] Firewall Overview', type: 'dashboard' },
    { id: 'fw-alerts', title: '[Logs AWS] Firewall Alerts', type: 'dashboard' },
    { id: 'fw-flows', title: '[Logs AWS] Firewall Flows', type: 'dashboard' },
    { id: 'fw-metrics', title: '[Metrics AWS] Firewall Overview', type: 'dashboard' },
  ],

  ec2: [
    { id: 'ec2-dash', title: '[Metrics AWS] EC2 Overview', type: 'dashboard' },
    { id: 'ec2-cpu-rule', title: 'EC2 high CPU utilization', type: 'alert_rule' },
    { id: 'ec2-status-rule', title: 'EC2 status check failed', type: 'alert_rule' },
  ],
  ec2_otel: [
    {
      id: 'ec2-otel-pkg',
      title: 'AWS EC2 Metrics OpenTelemetry Assets',
      type: 'content_package',
      description: 'beta',
    },
  ],
  lambda: [
    { id: 'lambda-metrics-dash', title: '[Metrics AWS] Lambda Overview', type: 'dashboard' },
    { id: 'lambda-logs-dash', title: '[Logs AWS] Lambda Log Overview', type: 'dashboard' },
    { id: 'lambda-errors-rule', title: 'Lambda errors', type: 'alert_rule' },
    { id: 'lambda-throttles-rule', title: 'Lambda throttles', type: 'alert_rule' },
  ],
  lambda_otel: [
    {
      id: 'lambda-otel-pkg',
      title: 'AWS Lambda Metrics OpenTelemetry Assets',
      type: 'content_package',
      description: 'beta',
    },
  ],
  ecs_otel: [
    {
      id: 'ecs-otel-pkg',
      title: 'AWS ECS Metrics OpenTelemetry Assets',
      type: 'content_package',
      description: 'beta',
    },
  ],
  emr: [
    { id: 'emr-metrics-dash', title: '[Metrics AWS] EMR Overview', type: 'dashboard' },
    { id: 'emr-logs-dash', title: '[Logs AWS] EMR Overview', type: 'dashboard' },
  ],

  vpcflow: [
    { id: 'vpc-dash', title: '[Logs AWS] VPC Flow Log Overview', type: 'dashboard' },
  ],
  vpcflow_otel: [
    {
      id: 'vpc-otel-pkg',
      title: 'AWS VPC Flow Logs OpenTelemetry Assets',
      type: 'content_package',
      description: 'beta',
    },
  ],
  vpn: [{ id: 'vpn-dash', title: '[Metrics AWS] VPN Overview', type: 'dashboard' }],
  natgateway: [
    { id: 'nat-dash', title: '[Metrics AWS] NAT Gateway Overview', type: 'dashboard' },
  ],
  transitgateway: [
    { id: 'tgw-dash', title: '[Metrics AWS] Transit Gateway Overview', type: 'dashboard' },
  ],
  elb: [
    { id: 'elb-metrics-dash', title: '[Metrics AWS] ELB Overview', type: 'dashboard' },
    { id: 'alb-dash', title: '[Metrics AWS] ALB Overview', type: 'dashboard' },
    { id: 'nlb-dash', title: '[Metrics AWS] NLB Overview', type: 'dashboard' },
    { id: 'elb-logs-dash', title: '[Logs AWS] ELB Access Log Overview', type: 'dashboard' },
  ],
  elb_logs_otel: [
    {
      id: 'elb-logs-otel-pkg',
      title: 'AWS ELB Logs OpenTelemetry Assets',
      type: 'content_package',
      description: 'beta',
    },
  ],
  elb_metrics_otel: [
    {
      id: 'elb-metrics-otel-pkg',
      title: 'AWS ELB Metrics OpenTelemetry Assets',
      type: 'content_package',
      description: 'beta',
    },
  ],
  apigateway: [
    { id: 'apigw-rest-dash', title: '[Metrics AWS] API Gateway REST Overview', type: 'dashboard' },
    { id: 'apigw-http-dash', title: '[Metrics AWS] API Gateway HTTP Overview', type: 'dashboard' },
    {
      id: 'apigw-ws-dash',
      title: '[Metrics AWS] API Gateway WebSocket Overview',
      type: 'dashboard',
    },
    { id: 'apigw-logs-dash', title: '[Logs AWS] API Gateway Overview', type: 'dashboard' },
  ],

  s3: [
    { id: 's3-metrics-dash', title: '[Metrics AWS] S3 Overview', type: 'dashboard' },
    { id: 's3-logs-dash', title: '[Logs AWS] S3 Server Access Log Overview', type: 'dashboard' },
  ],
  s3_storage_lens: [
    { id: 's3-lens-dash', title: '[Metrics AWS] S3 Storage Lens Overview', type: 'dashboard' },
  ],
  ebs: [{ id: 'ebs-dash', title: '[Metrics AWS] EBS Overview', type: 'dashboard' }],

  rds: [{ id: 'rds-dash', title: '[Metrics AWS] RDS Overview', type: 'dashboard' }],
  rds_otel: [
    {
      id: 'rds-otel-pkg',
      title: 'AWS RDS Metrics OpenTelemetry Assets',
      type: 'content_package',
      description: 'beta',
    },
  ],
  dynamodb: [
    { id: 'ddb-dash', title: '[Metrics AWS] DynamoDB Overview', type: 'dashboard' },
  ],
  redshift: [
    { id: 'redshift-dash', title: '[Metrics AWS] Redshift Overview', type: 'dashboard' },
  ],

  kinesis: [
    { id: 'kinesis-dash', title: '[Metrics AWS] Kinesis Overview', type: 'dashboard' },
  ],
  kafka: [{ id: 'msk-dash', title: '[Metrics AWS] MSK Overview', type: 'dashboard' }],

  sns: [
    { id: 'sns-dash', title: '[Metrics AWS] SNS Overview', type: 'dashboard' },
    { id: 'sns-failed-rule', title: 'SNS notifications failed', type: 'alert_rule' },
    { id: 'sns-filtered-rule', title: 'SNS notifications filtered out', type: 'alert_rule' },
  ],
  sqs: [
    { id: 'sqs-dash', title: '[Metrics AWS] SQS Overview', type: 'dashboard' },
    { id: 'sqs-visible-rule', title: 'SQS messages visible', type: 'alert_rule' },
    { id: 'sqs-oldest-rule', title: 'SQS oldest message age', type: 'alert_rule' },
  ],
  sqs_otel: [
    {
      id: 'sqs-otel-pkg',
      title: 'AWS SQS Metrics OpenTelemetry Assets',
      type: 'content_package',
      description: 'beta',
    },
  ],

  billing: [
    { id: 'billing-dash', title: '[Metrics AWS] Billing Overview', type: 'dashboard' },
  ],
  usage: [{ id: 'usage-dash', title: '[Metrics AWS] Usage Overview', type: 'dashboard' }],

  awshealth: [
    { id: 'health-dash', title: '[Metrics AWS] Health Overview', type: 'dashboard' },
  ],
};
