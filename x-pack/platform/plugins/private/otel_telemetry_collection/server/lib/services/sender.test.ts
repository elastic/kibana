/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { AnalyticsServiceStart } from '@kbn/core/server';
import { OtelTelemetrySender } from './sender';
import { OTEL_PER_SERVICE_EVENT } from '../ebt/events';
import type { OtelPerServiceResult } from './types';

const makeResult = (serviceId: string): OtelPerServiceResult => ({
  signal: 'traces',
  service_id: serviceId,
  environment: 'prod',
  doc_count: 195,
  sdk_names: ['opentelemetry'],
  sdk_languages: ['java'],
  sdk_versions: ['1.54.1'],
  distro_names: ['elastic'],
  distro_versions: ['1.6.1'],
  cloud_providers: [],
  cloud_platforms: [],
  cloud_regions: [],
  cloud_az: [],
  host_archs: ['aarch64'],
  os_types: ['linux'],
  os_names: ['Ubuntu'],
  os_versions: ['22.04'],
  os_descriptions: ['Ubuntu 22.04.1 LTS'],
  device_manufacturers: [],
  device_model_names: [],
  browser_platforms: [],
  user_agent_originals: [],
  runtime_names: ['OpenJDK Runtime Environment'],
  runtime_versions: ['11.0.8'],
  runtime_descriptions: ['Oracle Corporation OpenJDK 64-Bit Server VM 11.0.8+10'],
  executable_names: ['java'],
  webengine_names: [],
  webengine_versions: [],
  webengine_descriptions: [],
  scope_names: ['io.opentelemetry.grpc-1.6'],
  upstream_cluster: [],
  has_k8s: false,
  has_container: true,
});

describe('OtelTelemetrySender', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let analytics: jest.Mocked<AnalyticsServiceStart>;
  let sender: OtelTelemetrySender;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    analytics = {
      reportEvent: jest.fn(),
    } as unknown as jest.Mocked<AnalyticsServiceStart>;
    sender = new OtelTelemetrySender(logger, analytics);
  });

  it('should send a single event for results under maxElementsPerEvent', () => {
    const results = [makeResult('svc-1'), makeResult('svc-2')];

    sender.report(results, 5000);

    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(analytics.reportEvent).toHaveBeenCalledWith(OTEL_PER_SERVICE_EVENT.eventType, {
      batch_index: 0,
      batch_total: 1,
      results,
    });
  });

  it('should split results into multiple batches', () => {
    const results = Array.from({ length: 7 }, (_, i) => makeResult(`svc-${i}`));

    sender.report(results, 3);

    expect(analytics.reportEvent).toHaveBeenCalledTimes(3);

    expect(analytics.reportEvent).toHaveBeenNthCalledWith(1, OTEL_PER_SERVICE_EVENT.eventType, {
      batch_index: 0,
      batch_total: 3,
      results: results.slice(0, 3),
    });
    expect(analytics.reportEvent).toHaveBeenNthCalledWith(2, OTEL_PER_SERVICE_EVENT.eventType, {
      batch_index: 1,
      batch_total: 3,
      results: results.slice(3, 6),
    });
    expect(analytics.reportEvent).toHaveBeenNthCalledWith(3, OTEL_PER_SERVICE_EVENT.eventType, {
      batch_index: 2,
      batch_total: 3,
      results: results.slice(6, 7),
    });
  });

  it('should handle empty results', () => {
    sender.report([], 5000);

    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('should not report when maxElementsPerEvent is 0', () => {
    const results = [makeResult('svc-1')];

    sender.report(results, 0);

    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('should not report when maxElementsPerEvent is negative', () => {
    const results = [makeResult('svc-1')];

    sender.report(results, -1);

    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('should log total result count and batch count', () => {
    const results = Array.from({ length: 5 }, (_, i) => makeResult(`svc-${i}`));

    sender.report(results, 3);

    expect(logger.info).toHaveBeenCalledWith('Reported otel_per_service_stats', {
      resultCount: 5,
      batchTotal: 2,
    });
  });
});
