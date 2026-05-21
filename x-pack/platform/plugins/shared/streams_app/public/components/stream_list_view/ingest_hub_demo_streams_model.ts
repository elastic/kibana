/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A stream is the full topology: sources, pipeline (processing), routing, and destinations.
 */
export interface AwsMockStreamRow {
  readonly name: string;
  readonly parentName: string | null;
  readonly level: number;
  readonly isWiredRoot: boolean;
  readonly sourceCount: number;
  readonly processingStepCount: number;
  readonly routingStepCount: number;
  readonly destinationCount: number;
  readonly sourceTitle: string;
  readonly sourceLogoUrl: string;
  readonly docsPerSec: number;
  readonly docCount: number;
  readonly quality: 'good' | 'degraded' | 'poor';
  readonly histogramData: Array<{ x: number; y: number }>;
  readonly retentionDays: number;
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
