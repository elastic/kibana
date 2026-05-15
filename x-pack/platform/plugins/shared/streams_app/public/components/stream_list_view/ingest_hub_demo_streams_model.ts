/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AwsMockStreamRow {
  name: string;
  parentName: string | null;
  level: number;
  docCount: number;
  quality: 'good' | 'degraded' | 'poor';
  histogramData: Array<{ x: number; y: number }>;
  isRootStream: boolean;
}

export const MOCK_AWS_STREAMS_NOW = Date.now();
export const MOCK_AWS_STREAMS_RANGE_MS = 30 * 24 * 60 * 60 * 1000;

export const makeAwsMockSpark = (rate: number, points = 25): Array<{ x: number; y: number }> => {
  const step = MOCK_AWS_STREAMS_RANGE_MS / points;
  return Array.from({ length: points }, (_, i) => ({
    x: MOCK_AWS_STREAMS_NOW - MOCK_AWS_STREAMS_RANGE_MS + i * step,
    y: Math.max(
      0,
      rate * 60 + Math.floor((Math.sin(i * 0.7) * 0.4 + (i % 3 === 0 ? 0.3 : 0)) * rate * 60)
    ),
  }));
};

export const AWS_MOCK_STREAMS: AwsMockStreamRow[] = [
  {
    name: 'logs',
    parentName: null,
    level: 0,
    docCount: 6_964_800,
    quality: 'good',
    histogramData: makeAwsMockSpark(221),
    isRootStream: true,
  },
  {
    name: 'logs-aws.cloudwatch_logs-default',
    parentName: 'logs',
    level: 1,
    docCount: 2_505_600,
    quality: 'good',
    histogramData: makeAwsMockSpark(87),
    isRootStream: false,
  },
  {
    name: 'logs-aws.vpcflow-default',
    parentName: 'logs',
    level: 1,
    docCount: 1_612_800,
    quality: 'good',
    histogramData: makeAwsMockSpark(56),
    isRootStream: false,
  },
  {
    name: 'logs-aws.s3access-default',
    parentName: 'logs',
    level: 1,
    docCount: 979_200,
    quality: 'degraded',
    histogramData: makeAwsMockSpark(34),
    isRootStream: false,
  },
  {
    name: 'logs-aws.cloudtrail-default',
    parentName: 'logs',
    level: 1,
    docCount: 604_800,
    quality: 'good',
    histogramData: makeAwsMockSpark(21),
    isRootStream: false,
  },
  {
    name: 'logs-aws.elb_logs-default',
    parentName: 'logs',
    level: 1,
    docCount: 432_000,
    quality: 'good',
    histogramData: makeAwsMockSpark(15),
    isRootStream: false,
  },
  {
    name: 'logs-aws.guardduty-default',
    parentName: 'logs',
    level: 1,
    docCount: 230_400,
    quality: 'good',
    histogramData: makeAwsMockSpark(8),
    isRootStream: false,
  },
];
