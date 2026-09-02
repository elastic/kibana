/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prototype-only mock metadata for the Sources flyout.
 *
 * The real shape of source data is not decided yet, so the flyout shows
 * realistic-looking values derived from a stable hash of the source name. This
 * keeps the rendered content deterministic across renders while matching the
 * design mockup.
 */

export interface SourceConnectionDetail {
  label: string;
  value: string;
}

export interface SourceMockMetadata {
  description: string;
  isHealthy: boolean;
  polling: {
    interval: string;
    lastPoll: string;
    nextPoll: string;
    lookbackWindow: string;
  };
  throughput: {
    metricPointsPerMin: string;
    bytesPerSec: string;
    uniqueDocs: string;
    ingestLatencyP95: string;
  };
  downstreamDataset: string;
  connection: SourceConnectionDetail[];
}

/** Simple deterministic string hash (djb2). */
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return Math.abs(hash);
}

const SOURCE_DESCRIPTIONS: Record<string, string> = {
  'AWS CloudWatch':
    'Metrics emitted by AWS-managed services and stored in CloudWatch. No Elastic component runs in your AWS account — we poll the CloudWatch Metrics API on a schedule using a federated IAM role.',
};

const DEFAULT_DESCRIPTION =
  'Telemetry collected from this source on a schedule. No Elastic component runs in your environment — we poll the provider API using a federated, least-privilege role.';

export function getSourceMockMetadata(sourceName: string): SourceMockMetadata {
  const hash = hashString(sourceName);

  const interval = 30 + (hash % 90); // 30s - 119s
  const lastPoll = hash % 60; // 0 - 59s ago
  const nextPoll = interval - lastPoll;
  const lookbackMinutes = 5 + (hash % 10); // 5 - 14 min

  const metricPointsPerMin = 1000 + (hash % 9000); // 1,000 - 9,999
  const bytesPerSec = 100 + (hash % 900); // 100 - 999 KB
  const uniqueDocs = 500 + (hash % 4500); // 500 - 4,999
  const ingestLatency = 20 + (hash % 50); // 20s - 69s

  const accountId = String(100000000000 + (hash % 900000000000));
  const externalId = `elastic-acme-prod-${(hash % 0xffff).toString(16).padStart(4, '0')}`;

  return {
    description: SOURCE_DESCRIPTIONS[sourceName] ?? DEFAULT_DESCRIPTION,
    isHealthy: hash % 7 !== 0, // most are healthy, some are not
    polling: {
      interval: `${interval}s`,
      lastPoll: `${lastPoll}s ago`,
      nextPoll: `in ${nextPoll}s`,
      lookbackWindow: `${lookbackMinutes} min`,
    },
    throughput: {
      metricPointsPerMin: metricPointsPerMin.toLocaleString('en-US'),
      bytesPerSec: `${bytesPerSec} KB`,
      uniqueDocs: uniqueDocs.toLocaleString('en-US'),
      ingestLatencyP95: `${ingestLatency}s`,
    },
    downstreamDataset: 'metrics-aws.cloudwatch',
    connection: [
      { label: 'Method', value: 'Agentless · OIDC + IAM role' },
      { label: 'AWS account', value: `${accountId} (acme-prod)` },
      {
        label: 'IAM role',
        value: `arn:aws:iam::${accountId}:role/elastic-cloudwatch-reader`,
      },
      { label: 'OIDC issuer', value: 'serverless.elastic.cloud' },
      { label: 'External ID', value: externalId },
      {
        label: 'Permissions',
        value: 'cloudwatch:GetMetricData, cloudwatch:ListMetrics, tag:GetResources',
      },
    ],
  };
}
