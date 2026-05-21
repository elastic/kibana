/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useCallback, useEffect, useState } from 'react';
import {
  AWS_SERVICES_VERSION1_MATRIX,
  AWS_VERSION1_LOGS_SERVICE_IDS,
} from './data_sources_view/aws_services_data';
import {
  countTopologyParts,
  type IngestHubDemoStreamTopology,
} from './ingest_hub_demo_stream_topology';
import type { AwsMockStreamRow } from './stream_list_view/ingest_hub_demo_streams_model';
import {
  makeAwsMockSpark,
  MOCK_AWS_STREAMS_RANGE_MS,
} from './stream_list_view/ingest_hub_demo_streams_model';

/** Session flag set when AWS onboarding completes or prototype demo is active. */
export const INGEST_HUB_DATA_ADDED_SESSION_KEY = 'ingestHub:dataAdded';

export const INGEST_HUB_DATA_ADDED_EVENT = 'ingestHub:dataAddedChange';

export type AwsLogsDemoDataSourceStatus = 'active' | 'delayed' | 'stale';

export type AwsLogsDemoDataSourceCategory =
  | 'integration'
  | 'input_package'
  | 'asset'
  | 'connector'
  | 'api'
  | 'custom';

export interface AwsLogsDemoDataSource {
  readonly id: string;
  readonly name: string;
  readonly category: AwsLogsDemoDataSourceCategory;
  readonly docsPerSec: number;
  readonly streamName: string;
  readonly logoUrl: string;
  readonly status: AwsLogsDemoDataSourceStatus;
  readonly lastSeen: string;
  readonly detail: string;
  readonly dashboards?: number;
  readonly rules?: number;
  readonly hasUpdate?: boolean;
  readonly hasRollback?: boolean;
}

/**
 * FinServe Corp — multi-account AWS org (prod + security OU) with centralized SecOps:
 * CloudTrail org trail, edge (CloudFront/WAF/ALB), workload logs (Lambda/EC2/EMR),
 * and Security Hub / GuardDuty / Inspector for detection & compliance.
 */
interface AwsLogsDemoServiceSpec {
  readonly serviceId: string;
  readonly displayName: string;
  readonly docsPerSec: number;
  readonly category: AwsLogsDemoDataSourceCategory;
  readonly status: AwsLogsDemoDataSourceStatus;
  readonly lastSeen: string;
  readonly detail: string;
  readonly dashboards?: number;
  readonly rules?: number;
  readonly hasUpdate?: boolean;
  readonly hasRollback?: boolean;
}

const AWS_LOGS_DEMO_SERVICE_SPECS: readonly AwsLogsDemoServiceSpec[] = [
  {
    serviceId: 'cloudwatch_logs',
    displayName: 'AWS CloudWatch Logs',
    docsPerSec: 142,
    category: 'integration',
    status: 'active',
    lastSeen: 'Just now',
    detail: '47 log groups · 3 regions',
    dashboards: 6,
    rules: 14,
  },
  {
    serviceId: 'apigateway_logs',
    displayName: 'AWS API Gateway',
    docsPerSec: 48,
    category: 'integration',
    status: 'active',
    lastSeen: 'Just now',
    detail: '6 REST APIs · prod-us-east-1',
    dashboards: 2,
    rules: 5,
  },
  {
    serviceId: 'cloudtrail',
    displayName: 'AWS CloudTrail',
    docsPerSec: 31,
    category: 'integration',
    status: 'active',
    lastSeen: 'Just now',
    detail: 'Org trail · 4 linked accounts',
    dashboards: 3,
    rules: 8,
  },
  {
    serviceId: 'elb_logs',
    displayName: 'AWS ELB access logs',
    docsPerSec: 28,
    category: 'input_package',
    status: 'active',
    lastSeen: 'Just now',
    detail: '9 load balancers · S3 delivery',
    dashboards: 2,
    rules: 4,
    hasRollback: true,
  },
  {
    serviceId: 'waf',
    displayName: 'AWS WAF',
    docsPerSec: 22,
    category: 'integration',
    status: 'active',
    lastSeen: 'Just now',
    detail: '5 Web ACLs · customer APIs',
    dashboards: 2,
    rules: 11,
  },
  {
    serviceId: 'cloudfront_logs',
    displayName: 'AWS CloudFront',
    docsPerSec: 19,
    category: 'input_package',
    status: 'delayed',
    lastSeen: '18 min ago',
    detail: '4 distributions · S3 standard logs',
    dashboards: 1,
    rules: 3,
    hasUpdate: true,
  },
  {
    serviceId: 'lambda_logs',
    displayName: 'AWS Lambda',
    docsPerSec: 17,
    category: 'integration',
    status: 'active',
    lastSeen: 'Just now',
    detail: '84 functions · payments & auth',
    dashboards: 2,
    rules: 6,
  },
  {
    serviceId: 'ec2_logs',
    displayName: 'AWS EC2',
    docsPerSec: 14,
    category: 'integration',
    status: 'active',
    lastSeen: 'Just now',
    detail: '128 instances · core banking VPC',
    dashboards: 1,
    rules: 2,
  },
  {
    serviceId: 'securityhub_findings',
    displayName: 'AWS Security Hub findings',
    docsPerSec: 12,
    category: 'integration',
    status: 'active',
    lastSeen: 'Just now',
    detail: 'ASFF · 4 accounts',
    dashboards: 4,
    rules: 9,
  },
  {
    serviceId: 'guardduty',
    displayName: 'Amazon GuardDuty',
    docsPerSec: 9,
    category: 'integration',
    status: 'active',
    lastSeen: 'Just now',
    detail: '3 detectors · all regions',
    dashboards: 3,
    rules: 7,
  },
  {
    serviceId: 'firewall_logs',
    displayName: 'AWS Network Firewall',
    docsPerSec: 7,
    category: 'input_package',
    status: 'active',
    lastSeen: 'Just now',
    detail: '2 firewalls · egress inspection',
    dashboards: 1,
    rules: 4,
  },
  {
    serviceId: 'emr_logs',
    displayName: 'AWS EMR',
    docsPerSec: 6,
    category: 'integration',
    status: 'active',
    lastSeen: '2 min ago',
    detail: '3 clusters · risk analytics',
    dashboards: 1,
    rules: 1,
  },
  {
    serviceId: 'config',
    displayName: 'AWS Config',
    docsPerSec: 5,
    category: 'integration',
    status: 'active',
    lastSeen: 'Just now',
    detail: '2 recorders · CIS benchmark',
    dashboards: 2,
    rules: 3,
    hasUpdate: true,
  },
  {
    serviceId: 'inspector',
    displayName: 'AWS Inspector',
    docsPerSec: 4,
    category: 'integration',
    status: 'active',
    lastSeen: 'Just now',
    detail: 'EC2 + ECR vulnerability scans',
    dashboards: 1,
    rules: 2,
  },
  {
    serviceId: 'securityhub_findings_full_posture',
    displayName: 'AWS Security Hub CSPM',
    docsPerSec: 3,
    category: 'integration',
    status: 'active',
    lastSeen: '5 min ago',
    detail: '12 failing controls · prod OU',
    dashboards: 2,
    rules: 5,
  },
  {
    serviceId: 'securityhub_insights',
    displayName: 'AWS Security Hub insights',
    docsPerSec: 2,
    category: 'integration',
    status: 'stale',
    lastSeen: '3 h ago',
    detail: '8 custom insights · batch export',
    dashboards: 1,
    rules: 0,
  },
] as const;

const version1LogsServiceById = new Map(
  AWS_SERVICES_VERSION1_MATRIX.filter((service) =>
    AWS_VERSION1_LOGS_SERVICE_IDS.includes(service.id)
  ).map((service) => [service.id, service])
);

const streamQualityFromStatus = (
  status: AwsLogsDemoDataSourceStatus
): AwsMockStreamRow['quality'] => {
  if (status === 'delayed') {
    return 'degraded';
  }
  if (status === 'stale') {
    return 'poor';
  }
  return 'good';
};

const docsInRangeForRate = (docsPerSec: number): number =>
  Math.round(docsPerSec * 60 * (MOCK_AWS_STREAMS_RANGE_MS / 60_000));

export const AWS_LOGS_DEMO_DATA_SOURCES: AwsLogsDemoDataSource[] = AWS_LOGS_DEMO_SERVICE_SPECS.map(
  (spec) => {
    const matrixRow = version1LogsServiceById.get(spec.serviceId);
    if (!matrixRow) {
      throw new Error(`Missing AWS V1 logs matrix row for ${spec.serviceId}`);
    }
    return {
      id: spec.serviceId,
      name: spec.displayName,
      category: spec.category,
      docsPerSec: spec.docsPerSec,
      streamName: `logs-aws.${spec.serviceId}-default`,
      logoUrl: matrixRow.logoUrl,
      status: spec.status,
      lastSeen: spec.lastSeen,
      detail: spec.detail,
      dashboards: spec.dashboards,
      rules: spec.rules,
      hasUpdate: spec.hasUpdate,
      hasRollback: spec.hasRollback,
    };
  }
);

export const AWS_LOGS_WIRED_STREAM_TOPOLOGY: IngestHubDemoStreamTopology = {
  streamName: 'logs',
  displayTitle: i18n.translate('xpack.streams.awsLogsTopology.title', {
    defaultMessage: 'AWS organization logs',
  }),
  sources: [...AWS_LOGS_DEMO_DATA_SOURCES]
    .sort((a, b) => b.docsPerSec - a.docsPerSec)
    .map((source) => ({
      id: source.id,
      title: source.name,
      logoUrl: source.logoUrl,
      docsPerSec: source.docsPerSec,
    })),
  processingSteps: [
    {
      id: 'normalize_timestamp',
      label: i18n.translate('xpack.streams.awsLogsTopology.step.normalize', {
        defaultMessage: 'Normalize @timestamp',
      }),
      streamlangSummary: 'set @timestamp = parse_timestamp(field: "@timestamp")',
    },
    {
      id: 'ecs_map',
      label: i18n.translate('xpack.streams.awsLogsTopology.step.ecs', {
        defaultMessage: 'Map AWS fields to ECS',
      }),
      streamlangSummary: 'rename aws.* → event.*, cloud.*',
    },
    {
      id: 'geo_enrich',
      label: i18n.translate('xpack.streams.awsLogsTopology.step.geo', {
        defaultMessage: 'GeoIP enrichment',
      }),
      streamlangSummary: 'geoip source.ip → source.geo',
    },
  ],
  routingSteps: [
    {
      id: 'route_by_integration',
      label: i18n.translate('xpack.streams.awsLogsTopology.route.integration', {
        defaultMessage: 'Route by integration',
      }),
      conditionSummary: 'event.dataset == aws.*',
    },
    {
      id: 'route_security',
      label: i18n.translate('xpack.streams.awsLogsTopology.route.security', {
        defaultMessage: 'Security findings branch',
      }),
      conditionSummary: 'event.category == security',
    },
  ],
  destinations: [...AWS_LOGS_DEMO_DATA_SOURCES]
    .sort((a, b) => b.docsPerSec - a.docsPerSec)
    .map((source) => ({
      id: source.id,
      name: source.streamName,
      isStream: true,
      docsPerSec: source.docsPerSec,
      quality:
        source.status === 'delayed' ? 'degraded' : source.status === 'stale' ? 'poor' : 'good',
    })),
};

export const buildAwsLogsMockStreams = (): AwsMockStreamRow[] => {
  const topologyCounts = countTopologyParts(AWS_LOGS_WIRED_STREAM_TOPOLOGY);
  const totalDocsPerSec = AWS_LOGS_DEMO_DATA_SOURCES.reduce((sum, s) => sum + s.docsPerSec, 0);
  const totalDocCount = AWS_LOGS_DEMO_DATA_SOURCES.reduce(
    (sum, s) => sum + docsInRangeForRate(s.docsPerSec),
    0
  );

  const rootRow: AwsMockStreamRow = {
    name: AWS_LOGS_WIRED_STREAM_TOPOLOGY.streamName,
    parentName: null,
    level: 0,
    isWiredRoot: true,
    sourceCount: topologyCounts.sources,
    processingStepCount: topologyCounts.processing,
    routingStepCount: topologyCounts.routing,
    destinationCount: topologyCounts.destinations,
    sourceTitle: AWS_LOGS_WIRED_STREAM_TOPOLOGY.displayTitle,
    sourceLogoUrl: AWS_LOGS_DEMO_DATA_SOURCES[0]?.logoUrl ?? '',
    docsPerSec: totalDocsPerSec,
    docCount: totalDocCount,
    quality: 'good',
    histogramData: makeAwsMockSpark(totalDocsPerSec),
    retentionDays: 30,
  };

  const childRows = AWS_LOGS_DEMO_DATA_SOURCES.map((source) => ({
    name: source.streamName,
    parentName: AWS_LOGS_WIRED_STREAM_TOPOLOGY.streamName as string,
    level: 1,
    isWiredRoot: false,
    sourceCount: 1,
    processingStepCount: AWS_LOGS_WIRED_STREAM_TOPOLOGY.processingSteps.length,
    routingStepCount: 1,
    destinationCount: 1,
    sourceTitle: source.name,
    sourceLogoUrl: source.logoUrl,
    docsPerSec: source.docsPerSec,
    docCount: docsInRangeForRate(source.docsPerSec),
    quality: streamQualityFromStatus(source.status),
    histogramData: makeAwsMockSpark(source.docsPerSec),
    retentionDays: 30,
  })).sort((a, b) => b.docsPerSec - a.docsPerSec);

  return [rootRow, ...childRows];
};

export const AWS_LOGS_MOCK_STREAMS: AwsMockStreamRow[] = buildAwsLogsMockStreams();

/** Prototype: show populated AWS logs scenario when the session flag has never been set. */
export const readIngestHubAwsLogsDemoActive = (): boolean => {
  try {
    const stored = sessionStorage.getItem(INGEST_HUB_DATA_ADDED_SESSION_KEY);
    if (stored === 'false') {
      return false;
    }
    if (stored === 'true') {
      return true;
    }
    sessionStorage.setItem(INGEST_HUB_DATA_ADDED_SESSION_KEY, 'true');
    return true;
  } catch {
    return true;
  }
};

export const setIngestHubAwsLogsDemoActive = (active: boolean): void => {
  try {
    sessionStorage.setItem(INGEST_HUB_DATA_ADDED_SESSION_KEY, active ? 'true' : 'false');
  } catch {
    // sessionStorage may be unavailable in tests
  }
  window.dispatchEvent(new CustomEvent(INGEST_HUB_DATA_ADDED_EVENT));
};

export const useIngestHubAwsLogsDemoActive = (): boolean => {
  const [isActive, setIsActive] = useState(readIngestHubAwsLogsDemoActive);

  useEffect(() => {
    const sync = () => {
      setIsActive(readIngestHubAwsLogsDemoActive());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === INGEST_HUB_DATA_ADDED_SESSION_KEY) {
        sync();
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(INGEST_HUB_DATA_ADDED_EVENT, sync);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(INGEST_HUB_DATA_ADDED_EVENT, sync);
    };
  }, []);

  return isActive;
};

export const useMarkIngestHubAwsLogsDemoActive = (): (() => void) =>
  useCallback(() => {
    setIngestHubAwsLogsDemoActive(true);
  }, []);
