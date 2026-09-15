/**
 * AWS bundle members for the "Select services" and "Settings" steps.
 *
 * authOptions — which auth methods are supported:
 *   's3-only'        → always S3, ARN required (e.g. CloudTrail, VPC Flow Logs)
 *   'cloudwatch-only' → always CloudWatch, no extra field
 *   'both'           → user can pick; S3 requires ARN, CloudWatch needs nothing
 *
 * defaultAuth — which method is pre-selected when the user opens the service.
 *
 * iconSrc — service-specific SVG from Iconify logos collection (/logos/aws-svc-*.svg).
 *           Falls back to /logos/collection-aws.svg when no branded icon is available.
 *           Updated 09-14: replaced wrong _otel content-package logos with proper icons.
 *
 * description — one sentence blurb, hidden by default (SHOW_DESCRIPTIONS flag).
 */

import type { Signal } from './signals_section';

export type AuthMethod = 'S3' | 'CloudWatch';
export type AuthOptions = 's3-only' | 'cloudwatch-only' | 'both';

export interface BundleService {
  id: string;
  title: string;
  group: string;
  signals: ReadonlyArray<Signal>;
  iconSrc: string;
  description: string;
  authOptions: AuthOptions;
  defaultAuth: AuthMethod;
}

/** Generic AWS logo — used when no service-specific icon is available. */
const AWS = '/logos/collection-aws.svg';

export const AWS_SERVICES: ReadonlyArray<BundleService> = [
  // ── Security, Identity and Compliance ──────────────────────────────────────
  {
    id: 'cloudtrail',
    title: 'AWS CloudTrail',
    group: 'Security, Identity and Compliance',
    signals: ['Logs'],
    iconSrc: '/logos/aws-svc-cloudtrail.svg',
    description: 'Audit trail of API calls and account activity across your AWS infrastructure.',
    authOptions: 's3-only',
    defaultAuth: 'S3',
  },
  {
    id: 'config',
    title: 'AWS Config',
    group: 'Security, Identity and Compliance',
    signals: ['Metrics'],
    iconSrc: '/logos/aws-svc-config.svg',
    description: 'Continuous assessment of AWS resource configurations for compliance.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'guardduty',
    title: 'Amazon GuardDuty',
    group: 'Security, Identity and Compliance',
    signals: ['Logs', 'Metrics'],
    iconSrc: '/logos/aws-svc-guardduty.svg',
    description: 'Intelligent threat detection for your AWS accounts and workloads.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'inspector',
    title: 'Amazon Inspector',
    group: 'Security, Identity and Compliance',
    signals: ['Metrics'],
    iconSrc: AWS,
    description: 'Automated vulnerability management for EC2, Lambda, and container images.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'securityhub',
    title: 'AWS Security Hub',
    group: 'Security, Identity and Compliance',
    signals: ['Logs'],
    iconSrc: AWS,
    description: 'Centralised security findings across AWS services and partner tools.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'securityhub-cspm',
    title: 'AWS Security Hub CSPM',
    group: 'Security, Identity and Compliance',
    signals: ['Metrics'],
    iconSrc: AWS,
    description: 'Cloud security posture management findings from Security Hub.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'security-lake',
    title: 'Amazon Security Lake',
    group: 'Security, Identity and Compliance',
    signals: ['Logs'],
    iconSrc: AWS,
    description: 'Centralised security data lake aggregating logs from AWS and third parties.',
    authOptions: 'both',
    defaultAuth: 'S3',
  },
  {
    id: 'waf',
    title: 'AWS WAF',
    group: 'Security, Identity and Compliance',
    signals: ['Logs'],
    iconSrc: '/logos/aws-svc-waf.svg',
    description: 'Web application firewall logs showing allowed, blocked, and counted requests.',
    authOptions: 'both',
    defaultAuth: 'S3',
  },
  {
    id: 'network-firewall',
    title: 'AWS Network Firewall',
    group: 'Security, Identity and Compliance',
    signals: ['Logs', 'Metrics'],
    iconSrc: AWS,
    description: 'Flow and alert logs from the managed network firewall service.',
    authOptions: 'both',
    defaultAuth: 'S3',
  },

  // ── Compute Services ───────────────────────────────────────────────────────
  {
    id: 'ec2',
    title: 'Amazon EC2',
    group: 'Compute Services',
    signals: ['Logs', 'Metrics'],
    iconSrc: '/logos/aws-svc-ec2-color.svg',
    description: 'Instance metrics and system logs from your EC2 fleet.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'lambda',
    title: 'AWS Lambda',
    group: 'Compute Services',
    signals: ['Logs', 'Metrics'],
    iconSrc: '/logos/aws-svc-lambda.svg',
    description: 'Invocation metrics and function logs from serverless Lambda functions.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'ecs',
    title: 'Amazon ECS',
    group: 'Compute Services',
    signals: ['Metrics'],
    iconSrc: '/logos/aws-svc-ecs.svg',
    description: 'Container and cluster-level metrics from your ECS services.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'fargate',
    title: 'AWS Fargate',
    group: 'Compute Services',
    signals: ['Metrics'],
    iconSrc: '/logos/awsfargate.svg',
    description: 'CPU, memory, and network metrics for Fargate tasks and services.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'emr',
    title: 'Amazon EMR',
    group: 'Compute Services',
    signals: ['Logs', 'Metrics'],
    iconSrc: '/logos/aws-svc-emr.svg',
    description: 'Cluster metrics and step logs from your big data EMR workloads.',
    authOptions: 'both',
    defaultAuth: 'CloudWatch',
  },

  // ── Networking and Content Delivery ────────────────────────────────────────
  {
    id: 'vpc',
    title: 'Amazon VPC',
    group: 'Networking and Content Delivery',
    signals: ['Logs'],
    iconSrc: '/logos/aws-svc-vpc.svg',
    description: 'VPC Flow Logs capturing accepted and rejected traffic at the interface level.',
    authOptions: 's3-only',
    defaultAuth: 'S3',
  },
  {
    id: 'vpn',
    title: 'Amazon VPN',
    group: 'Networking and Content Delivery',
    signals: ['Metrics'],
    iconSrc: AWS,
    description: 'Tunnel state and throughput metrics for your Site-to-Site VPN connections.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'nat-gateway',
    title: 'Amazon NAT Gateway',
    group: 'Networking and Content Delivery',
    signals: ['Metrics'],
    iconSrc: AWS,
    description: 'Connection and bandwidth metrics for NAT Gateways in your VPCs.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'transit-gateway',
    title: 'AWS Transit Gateway',
    group: 'Networking and Content Delivery',
    signals: ['Metrics'],
    iconSrc: AWS,
    description: 'Packet and byte metrics for traffic flowing through Transit Gateway attachments.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'elb',
    title: 'AWS ELB',
    group: 'Networking and Content Delivery',
    signals: ['Logs', 'Metrics'],
    iconSrc: AWS,
    description: 'Access logs and request metrics from Application, Network, and Classic load balancers.',
    authOptions: 'both',
    defaultAuth: 'S3',
  },
  {
    id: 'route53',
    title: 'AWS Route 53',
    group: 'Networking and Content Delivery',
    signals: ['Logs'],
    iconSrc: '/logos/aws-svc-route53.svg',
    description: 'DNS query logs for your Route 53 hosted zones and resolver queries.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'cloudfront',
    title: 'Amazon CloudFront',
    group: 'Networking and Content Delivery',
    signals: ['Logs'],
    iconSrc: '/logos/aws-svc-cloudfront.svg',
    description: 'Access logs for requests served by your CloudFront distributions.',
    authOptions: 'both',
    defaultAuth: 'S3',
  },
  {
    id: 'api-gateway',
    title: 'AWS API Gateway',
    group: 'Networking and Content Delivery',
    signals: ['Logs', 'Metrics'],
    iconSrc: '/logos/aws-svc-api-gateway.svg',
    description: 'Execution logs and latency metrics for REST and HTTP APIs.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },

  // ── Storage Solutions ──────────────────────────────────────────────────────
  {
    id: 's3',
    title: 'Amazon S3',
    group: 'Storage Solutions',
    signals: ['Logs', 'Metrics'],
    iconSrc: '/logos/aws-svc-s3.svg',
    description: 'Server access logs and request metrics for your S3 buckets.',
    authOptions: 'both',
    defaultAuth: 'S3',
  },
  {
    id: 's3-storage-lens',
    title: 'Amazon S3 Storage Lens',
    group: 'Storage Solutions',
    signals: ['Metrics'],
    iconSrc: '/logos/aws-svc-s3.svg',
    description: 'Organisation-wide storage analytics and activity trends from S3 Storage Lens.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'ebs',
    title: 'Amazon EBS',
    group: 'Storage Solutions',
    signals: ['Metrics'],
    iconSrc: '/logos/aws-svc-ebs.svg',
    description: 'Volume performance metrics (IOPS, throughput, latency) for your EBS volumes.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },

  // ── Database Services ──────────────────────────────────────────────────────
  {
    id: 'rds',
    title: 'Amazon RDS',
    group: 'Database Services',
    signals: ['Metrics'],
    iconSrc: '/logos/aws-svc-rds.svg',
    description: 'CPU, connections, and storage metrics for your RDS instances.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'dynamodb',
    title: 'Amazon DynamoDB',
    group: 'Database Services',
    signals: ['Metrics'],
    iconSrc: '/logos/aws-svc-dynamodb.svg',
    description: 'Consumed capacity, throttle, and latency metrics for your DynamoDB tables.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'redshift',
    title: 'Amazon Redshift',
    group: 'Database Services',
    signals: ['Metrics'],
    iconSrc: '/logos/aws-svc-redshift.svg',
    description: 'Query performance and cluster health metrics for your Redshift data warehouse.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },

  // ── Analytics and Streaming ────────────────────────────────────────────────
  {
    id: 'kinesis',
    title: 'Amazon Kinesis Data Stream',
    group: 'Analytics and Streaming',
    signals: ['Metrics'],
    iconSrc: '/logos/aws-svc-kinesis.svg',
    description: 'Shard-level throughput and iterator metrics for your Kinesis data streams.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'msk',
    title: 'Amazon MSK (Kafka)',
    group: 'Analytics and Streaming',
    signals: ['Metrics'],
    iconSrc: AWS,
    description: 'Broker and topic metrics from your managed Kafka clusters on MSK.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'firehose',
    title: 'Amazon Data Firehose',
    group: 'Analytics and Streaming',
    signals: ['Logs'],
    iconSrc: '/logos/awsfirehose.svg',
    description: 'Delivery stream logs for data flowing through your Firehose pipelines.',
    authOptions: 'both',
    defaultAuth: 'S3',
  },

  // ── Application Integration ────────────────────────────────────────────────
  {
    id: 'sns',
    title: 'Amazon SNS',
    group: 'Application Integration',
    signals: ['Metrics'],
    iconSrc: '/logos/aws-svc-sns.svg',
    description: 'Message delivery and notification metrics for your SNS topics.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'sqs',
    title: 'Amazon SQS',
    group: 'Application Integration',
    signals: ['Metrics'],
    iconSrc: '/logos/aws-svc-sqs.svg',
    description: 'Queue depth, message age, and throughput metrics for SQS queues.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'mq',
    title: 'Amazon MQ',
    group: 'Application Integration',
    signals: ['Metrics'],
    iconSrc: '/logos/aws-svc-mq.svg',
    description: 'Broker metrics for your managed ActiveMQ and RabbitMQ message brokers.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },

  // ── Machine Learning ───────────────────────────────────────────────────────
  {
    id: 'bedrock',
    title: 'Amazon Bedrock',
    group: 'Machine Learning',
    signals: ['Logs', 'Metrics'],
    iconSrc: '/logos/aws-svc-bedrock.svg',
    description: 'Model invocation logs and token usage metrics for Bedrock foundation models.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'bedrock-agentcore',
    title: 'Amazon Bedrock AgentCore',
    group: 'Machine Learning',
    signals: ['Logs', 'Metrics'],
    iconSrc: '/logos/aws-svc-bedrock.svg',
    description: 'Trace logs and performance metrics for your Bedrock AI agents.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },

  // ── Cost Management ────────────────────────────────────────────────────────
  {
    id: 'billing',
    title: 'AWS Billing',
    group: 'Cost Management',
    signals: ['Metrics'],
    iconSrc: AWS,
    description: 'Estimated charges and usage metrics broken down by service.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'usage',
    title: 'AWS Usage',
    group: 'Cost Management',
    signals: ['Metrics'],
    iconSrc: AWS,
    description: 'Service usage metrics helping track consumption against limits.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'cur',
    title: 'AWS Cost and Usage Report',
    group: 'Cost Management',
    signals: ['Metrics'],
    iconSrc: AWS,
    description: 'Detailed cost and usage data from CUR 2.0 delivered to S3.',
    authOptions: 's3-only',
    defaultAuth: 'S3',
  },

  // ── Management and Monitoring ──────────────────────────────────────────────
  {
    id: 'cloudwatch',
    title: 'AWS CloudWatch',
    group: 'Management and Monitoring',
    signals: ['Logs', 'Metrics'],
    iconSrc: '/logos/aws-svc-cloudwatch.svg',
    description: 'Logs and custom metrics from CloudWatch log groups and namespaces.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'health',
    title: 'AWS Health',
    group: 'Management and Monitoring',
    signals: ['Metrics'],
    iconSrc: AWS,
    description: 'Service health events and scheduled maintenance notifications.',
    authOptions: 'cloudwatch-only',
    defaultAuth: 'CloudWatch',
  },
  {
    id: 'custom-logs',
    title: 'Custom AWS Logs',
    group: 'Management and Monitoring',
    signals: ['Logs'],
    iconSrc: AWS,
    description: 'Custom log streams from any AWS service delivered to S3 or CloudWatch Logs.',
    authOptions: 'both',
    defaultAuth: 'S3',
  },
];
