/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AWS integration matrix (Version 1 wizard).
 *
 * Each row describes which delivery methods apply to a catalog service and which
 * user inputs are required for that method. The **Inputs** column in the product
 * matrix maps to {@link AwsIntegrationInputId} values below.
 *
 * @see AWS_SERVICES_VERSION1_MATRIX in aws_services_data.ts
 */

/** How data is collected in the customer AWS account (matrix "Delivery Method"). */
export type AwsMatrixDeliveryMethod =
  | 'agentless'
  | 'cloud_forwarder'
  | 'firehose'
  | 'agent_based'
  | 'httpjson';

export type AwsMatrixSignalType = 'logs' | 'metrics';

/**
 * User-facing configuration fields referenced in the matrix "Inputs" column.
 * `regions` is required for nearly every row; other fields depend on delivery method.
 */
export type AwsIntegrationInputId =
  | 'regions'
  | 's3_bucket_arn'
  | 'firehose_delivery_stream_arn'
  | 'cloudwatch_log_group'
  | 'cloudtrail_trail_arn'
  | 'cloudwatch_namespace'
  | 'sqs_queue_arn';

export interface AwsIntegrationMatrixDeliveryConfig {
  readonly method: AwsMatrixDeliveryMethod;
  /** Integration input type from the matrix (e.g. aws-s3, aws/metrics). */
  readonly integrationInput?: string;
  /** Always collected when this delivery method is chosen. */
  readonly requiredInputs: readonly AwsIntegrationInputId[];
  /**
   * User must provide at least one field from each group (matrix "A or B" in Inputs column).
   * Example: S3 bucket ARN or Firehose delivery stream ARN.
   */
  readonly requireOneOf?: readonly (readonly AwsIntegrationInputId[])[];
}

export interface AwsIntegrationMatrixRow {
  /** Matches {@link AwsService.id} in aws_services_data.ts */
  readonly serviceId: string;
  readonly signalType: AwsMatrixSignalType;
  readonly category: string;
  readonly deliveryMethods: readonly AwsIntegrationMatrixDeliveryConfig[];
}

/** Labels for form fields (wizard copy). */
export const AWS_INTEGRATION_INPUT_LABELS: Record<
  AwsIntegrationInputId,
  { label: string; placeholder?: string; helpText?: string }
> = {
  regions: {
    label: 'AWS regions',
    helpText: 'Regions where this integration should collect data.',
  },
  s3_bucket_arn: {
    label: 'S3 bucket ARN',
    placeholder: 'arn:aws:s3:::my-log-bucket',
    helpText:
      'Bucket that receives or stores the logs (access log destination, trail bucket, etc.).',
  },
  firehose_delivery_stream_arn: {
    label: 'Firehose delivery stream ARN',
    placeholder: 'arn:aws:firehose:us-east-1:123456789012:deliverystream/my-stream',
    helpText:
      'Use when logs are delivered via Amazon Data Firehose instead of (or in addition to) S3.',
  },
  cloudwatch_log_group: {
    label: 'CloudWatch log group',
    placeholder: '/aws/lambda/my-function or arn:aws:logs:...',
    helpText: 'Log group name, prefix, or ARN to subscribe or poll.',
  },
  cloudtrail_trail_arn: {
    label: 'CloudTrail trail ARN',
    placeholder: 'arn:aws:cloudtrail:us-east-1:123456789012:trail/my-trail',
    helpText: 'Trail that delivers events to S3 or CloudWatch Logs.',
  },
  cloudwatch_namespace: {
    label: 'CloudWatch namespace',
    placeholder: 'AWS/EC2',
    helpText: 'Metric namespace to poll when collecting CloudWatch metrics.',
  },
  sqs_queue_arn: {
    label: 'SQS queue ARN',
    placeholder: 'arn:aws:sqs:us-east-1:123456789012:my-queue',
    helpText: 'Queue that receives S3 event notifications (OpenTelemetry S3 input).',
  },
};

const regionsOnly = (method: AwsMatrixDeliveryMethod): AwsIntegrationMatrixDeliveryConfig => ({
  method,
  requiredInputs: ['regions'],
});

const logsS3OrFirehose = (
  method: 'cloud_forwarder' | 'firehose',
  integrationInput = 'aws-s3'
): AwsIntegrationMatrixDeliveryConfig => ({
  method,
  integrationInput,
  requiredInputs: ['regions'],
  requireOneOf: [['s3_bucket_arn', 'firehose_delivery_stream_arn']],
});

const logsAgentlessLogGroup = (): AwsIntegrationMatrixDeliveryConfig => ({
  method: 'agentless',
  integrationInput: 'aws-cloudwatch',
  requiredInputs: ['cloudwatch_log_group', 'regions'],
});

/**
 * Version 1 matrix rows (green V1 tag in the spreadsheet).
 * Delivery methods not listed for a service are not offered in the wizard for that selection.
 */
export const AWS_INTEGRATION_MATRIX_V1: readonly AwsIntegrationMatrixRow[] = [
  {
    serviceId: 'apigateway_logs',
    signalType: 'logs',
    category: 'Serverless & Compute',
    deliveryMethods: [logsS3OrFirehose('cloud_forwarder'), logsS3OrFirehose('firehose')],
  },
  {
    serviceId: 'apigateway_metrics',
    signalType: 'metrics',
    category: 'Serverless & Compute',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'cloudfront_logs',
    signalType: 'logs',
    category: 'Networking',
    deliveryMethods: [logsS3OrFirehose('cloud_forwarder'), logsS3OrFirehose('firehose')],
  },
  {
    serviceId: 'cloudtrail',
    signalType: 'logs',
    category: 'Security',
    deliveryMethods: [
      {
        method: 'agentless',
        integrationInput: 'aws-cloudtrail',
        requiredInputs: ['cloudtrail_trail_arn', 'regions'],
        // S3 bucket ARN only when the trail delivers to S3 (optional in UI).
      },
      {
        method: 'cloud_forwarder',
        integrationInput: 'aws-s3',
        requiredInputs: ['regions'],
        requireOneOf: [['s3_bucket_arn']],
      },
      {
        method: 'firehose',
        integrationInput: 'aws-s3',
        requiredInputs: ['regions'],
        requireOneOf: [['s3_bucket_arn', 'firehose_delivery_stream_arn']],
      },
    ],
  },
  {
    serviceId: 'cloudwatch_logs',
    signalType: 'logs',
    category: 'Monitoring',
    deliveryMethods: [logsAgentlessLogGroup()],
  },
  {
    serviceId: 'cloudwatch_metrics',
    signalType: 'metrics',
    category: 'Monitoring',
    deliveryMethods: [
      {
        method: 'agentless',
        integrationInput: 'aws/metrics',
        requiredInputs: ['cloudwatch_namespace', 'regions'],
      },
    ],
  },
  {
    serviceId: 'config',
    signalType: 'logs',
    category: 'Compliance',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'dynamodb',
    signalType: 'metrics',
    category: 'Databases',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'ec2_logs',
    signalType: 'logs',
    category: 'Compute',
    deliveryMethods: [logsAgentlessLogGroup()],
  },
  {
    serviceId: 'ec2_metrics',
    signalType: 'metrics',
    category: 'Compute',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'ecs_metrics',
    signalType: 'metrics',
    category: 'Containers',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'elb_logs',
    signalType: 'logs',
    category: 'Networking',
    deliveryMethods: [logsS3OrFirehose('cloud_forwarder'), logsS3OrFirehose('firehose')],
  },
  {
    serviceId: 'elb_metrics',
    signalType: 'metrics',
    category: 'Networking',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'emr_logs',
    signalType: 'logs',
    category: 'Analytics',
    deliveryMethods: [
      logsAgentlessLogGroup(),
      logsS3OrFirehose('cloud_forwarder'),
      logsS3OrFirehose('firehose'),
    ],
  },
  {
    serviceId: 'emr_metrics',
    signalType: 'metrics',
    category: 'Analytics',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'firewall_logs',
    signalType: 'logs',
    category: 'Security',
    deliveryMethods: [logsS3OrFirehose('cloud_forwarder'), logsS3OrFirehose('firehose')],
  },
  {
    serviceId: 'firewall_metrics',
    signalType: 'metrics',
    category: 'Security',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'guardduty',
    signalType: 'logs',
    category: 'Security',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'inspector',
    signalType: 'logs',
    category: 'Security',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'kafka_metrics',
    signalType: 'metrics',
    category: 'Streaming',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'kinesis',
    signalType: 'metrics',
    category: 'Streaming',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'lambda',
    signalType: 'metrics',
    category: 'Serverless & Compute',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'lambda_logs',
    signalType: 'logs',
    category: 'Serverless & Compute',
    deliveryMethods: [logsAgentlessLogGroup()],
  },
  {
    serviceId: 'natgateway',
    signalType: 'metrics',
    category: 'Networking',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'rds',
    signalType: 'metrics',
    category: 'Databases',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 's3_daily_storage',
    signalType: 'metrics',
    category: 'Storage',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'securityhub_findings',
    signalType: 'logs',
    category: 'Security',
    deliveryMethods: [
      {
        method: 'httpjson',
        integrationInput: 'httpjson',
        requiredInputs: ['regions'],
      },
    ],
  },
  {
    serviceId: 'securityhub_findings_full_posture',
    signalType: 'logs',
    category: 'Compliance',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'securityhub_insights',
    signalType: 'logs',
    category: 'Security',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'waf',
    signalType: 'logs',
    category: 'Security',
    deliveryMethods: [logsS3OrFirehose('cloud_forwarder'), logsS3OrFirehose('firehose')],
  },
  {
    serviceId: 'bedrock_guardrails',
    signalType: 'metrics',
    category: 'AI Ops',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'bedrock_knowledgebases',
    signalType: 'metrics',
    category: 'AI Ops',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'bedrock_runtime',
    signalType: 'metrics',
    category: 'AI Ops',
    deliveryMethods: [regionsOnly('agentless')],
  },
  {
    serviceId: 'bedrock_agent_core',
    signalType: 'metrics',
    category: 'AI Ops',
    deliveryMethods: [regionsOnly('agentless')],
  },
];

const AWS_INTEGRATION_MATRIX_V1_BY_SERVICE_ID: ReadonlyMap<string, AwsIntegrationMatrixRow> =
  new Map(AWS_INTEGRATION_MATRIX_V1.map((row) => [row.serviceId, row]));

export function getAwsIntegrationMatrixRow(serviceId: string): AwsIntegrationMatrixRow | undefined {
  return AWS_INTEGRATION_MATRIX_V1_BY_SERVICE_ID.get(serviceId);
}

/** Delivery methods available for a service in the V1 matrix. */
export function getAwsMatrixDeliveryMethodsForService(
  serviceId: string
): readonly AwsIntegrationMatrixDeliveryConfig[] {
  return getAwsIntegrationMatrixRow(serviceId)?.deliveryMethods ?? [];
}

/**
 * Maps wizard deployment step IDs to matrix delivery method IDs.
 * Agent-based collection is not in the spreadsheet but is supported for mixed selections.
 */
export function awsWizardDeploymentToMatrixMethod(
  deploymentMethod: 'agentless' | 'agent_based' | 'cloud_forwarder' | 'firehose'
): AwsMatrixDeliveryMethod {
  return deploymentMethod;
}

/**
 * Required inputs for one selected service and the user's chosen deployment method.
 * Returns `undefined` if the service does not support that method in V1.
 */
export function getRequiredInputsForServiceAndDelivery(
  serviceId: string,
  deliveryMethod: AwsMatrixDeliveryMethod
): readonly AwsIntegrationInputId[] | undefined {
  const row = getAwsIntegrationMatrixRow(serviceId);
  if (!row) {
    return undefined;
  }
  const config = row.deliveryMethods.find((d) => d.method === deliveryMethod);
  return config?.requiredInputs;
}

/**
 * Union of required inputs across all selected services for a single deployment method.
 * `regions` is always listed once when any selected row needs it.
 */
export interface AwsIntegrationInputRequirements {
  readonly required: readonly AwsIntegrationInputId[];
  readonly requireOneOf: readonly (readonly AwsIntegrationInputId[])[];
}

export function getInputRequirementsForServiceAndDelivery(
  serviceId: string,
  deliveryMethod: AwsMatrixDeliveryMethod
): AwsIntegrationInputRequirements | undefined {
  const row = getAwsIntegrationMatrixRow(serviceId);
  const config = row?.deliveryMethods.find((d) => d.method === deliveryMethod);
  if (!config) {
    return undefined;
  }
  return {
    required: config.requiredInputs,
    requireOneOf: config.requireOneOf ?? [],
  };
}

/** Merges input requirements across selected services for one deployment method. */
export function getUnionInputRequirementsForSelection(params: {
  readonly serviceIds: ReadonlySet<string>;
  readonly deliveryMethod: AwsMatrixDeliveryMethod;
}): AwsIntegrationInputRequirements {
  const { serviceIds, deliveryMethod } = params;
  const required = new Set<AwsIntegrationInputId>();
  const oneOfGroups: AwsIntegrationInputId[][] = [];

  for (const serviceId of serviceIds) {
    const reqs = getInputRequirementsForServiceAndDelivery(serviceId, deliveryMethod);
    if (!reqs) {
      continue;
    }
    for (const input of reqs.required) {
      required.add(input);
    }
    for (const group of reqs.requireOneOf) {
      oneOfGroups.push([...group]);
    }
  }

  const order: AwsIntegrationInputId[] = [
    'regions',
    's3_bucket_arn',
    'firehose_delivery_stream_arn',
    'cloudwatch_log_group',
    'cloudtrail_trail_arn',
    'cloudwatch_namespace',
    'sqs_queue_arn',
  ];

  return {
    required: order.filter((id) => required.has(id)),
    requireOneOf: oneOfGroups,
  };
}

/** @deprecated Use {@link getUnionInputRequirementsForSelection} for OR-groups. */
export function getUnionRequiredInputsForSelection(params: {
  readonly serviceIds: ReadonlySet<string>;
  readonly deliveryMethod: AwsMatrixDeliveryMethod;
}): readonly AwsIntegrationInputId[] {
  const { required, requireOneOf } = getUnionInputRequirementsForSelection(params);
  const inputSet = new Set<AwsIntegrationInputId>(required);
  for (const group of requireOneOf) {
    for (const input of group) {
      inputSet.add(input);
    }
  }
  const order: AwsIntegrationInputId[] = [
    'regions',
    's3_bucket_arn',
    'firehose_delivery_stream_arn',
    'cloudwatch_log_group',
    'cloudtrail_trail_arn',
    'cloudwatch_namespace',
    'sqs_queue_arn',
  ];
  return order.filter((id) => inputSet.has(id));
}

/** Whether any selected V1 service supports the given delivery method. */
export function selectionSupportsDeliveryMethod(params: {
  readonly serviceIds: ReadonlySet<string>;
  readonly deliveryMethod: AwsMatrixDeliveryMethod;
}): boolean {
  const { serviceIds, deliveryMethod } = params;
  for (const serviceId of serviceIds) {
    const methods = getAwsMatrixDeliveryMethodsForService(serviceId);
    if (methods.some((m) => m.method === deliveryMethod)) {
      return true;
    }
  }
  return false;
}
