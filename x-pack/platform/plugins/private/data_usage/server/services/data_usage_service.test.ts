/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { AUTOOPS_MAX_DATA_STREAMS_PER_REQUEST } from '../../common';
import { DataUsageService } from '.';
import { AutoOpsAPIService } from './autoops_api';
import type { UsageMetricsRequestBody } from '../routes/internal/usage_metrics';

jest.mock('./autoops_api');

const MockedAutoOpsAPIService = AutoOpsAPIService as jest.MockedClass<typeof AutoOpsAPIService>;

const dataStreamNames = (count: number) =>
  Array.from({ length: count }, (_, index) => `ds-${index + 1}`);

/** Mirrors AutoOps: one series per requested data stream, keyed by name. */
const respondWithRequestedDataStreams = () =>
  jest.fn(async ({ dataStreams }: UsageMetricsRequestBody) => ({
    ingest_rate: dataStreams.map((name) => ({ name, error: null, data: [] })),
    storage_retained: dataStreams.map((name) => ({ name, error: null, data: [] })),
  }));

describe('DataUsageService.getMetrics', () => {
  let service: DataUsageService;
  let autoOpsUsageMetricsAPI: ReturnType<typeof respondWithRequestedDataStreams>;

  const getMetrics = (dataStreams: string[]) =>
    service.getMetrics({
      from: '2026-11-09T00:00:00.000Z',
      to: '2026-11-09T12:00:00.000Z',
      metricTypes: ['ingest_rate', 'storage_retained'],
      dataStreams,
    });

  beforeEach(() => {
    MockedAutoOpsAPIService.mockClear();
    autoOpsUsageMetricsAPI = respondWithRequestedDataStreams();
    MockedAutoOpsAPIService.prototype.autoOpsUsageMetricsAPI =
      autoOpsUsageMetricsAPI as unknown as AutoOpsAPIService['autoOpsUsageMetricsAPI'];

    service = new DataUsageService(loggingSystemMock.createLogger());
  });

  it('should issue a single request when the selection is within the AutoOps limit', async () => {
    await getMetrics(dataStreamNames(AUTOOPS_MAX_DATA_STREAMS_PER_REQUEST));

    expect(autoOpsUsageMetricsAPI).toHaveBeenCalledTimes(1);
    expect(autoOpsUsageMetricsAPI.mock.calls[0][0].dataStreams).toHaveLength(
      AUTOOPS_MAX_DATA_STREAMS_PER_REQUEST
    );
  });

  it('should split the selection into batches when it exceeds the AutoOps limit', async () => {
    await getMetrics(dataStreamNames(150));

    expect(autoOpsUsageMetricsAPI).toHaveBeenCalledTimes(2);
    expect(
      autoOpsUsageMetricsAPI.mock.calls.map(([{ dataStreams }]) => dataStreams.length)
    ).toEqual([100, 50]);
  });

  it('should never send more data streams than AutoOps accepts', async () => {
    await getMetrics(dataStreamNames(1000));

    expect(
      autoOpsUsageMetricsAPI.mock.calls.every(
        ([{ dataStreams }]) => dataStreams.length <= AUTOOPS_MAX_DATA_STREAMS_PER_REQUEST
      )
    ).toBe(true);
  });

  it('should start a new batch at one over the limit', async () => {
    await getMetrics(dataStreamNames(AUTOOPS_MAX_DATA_STREAMS_PER_REQUEST + 1));

    expect(autoOpsUsageMetricsAPI).toHaveBeenCalledTimes(2);
    expect(
      autoOpsUsageMetricsAPI.mock.calls.map(([{ dataStreams }]) => dataStreams.length)
    ).toEqual([100, 1]);
  });

  it('should request every selected data stream exactly once across the batches', async () => {
    const dataStreams = dataStreamNames(150);

    await getMetrics(dataStreams);

    expect(autoOpsUsageMetricsAPI.mock.calls.flatMap(([{ dataStreams: batch }]) => batch)).toEqual(
      dataStreams
    );
  });

  it('should merge the batched responses into a single series list per metric type', async () => {
    const dataStreams = dataStreamNames(150);

    const metrics = await getMetrics(dataStreams);

    expect(metrics.ingest_rate?.map(({ name }) => name)).toEqual(dataStreams);
    expect(metrics.storage_retained?.map(({ name }) => name)).toEqual(dataStreams);
  });

  it('should forward the time range and metric types unchanged to every batch', async () => {
    await getMetrics(dataStreamNames(150));

    for (const [request] of autoOpsUsageMetricsAPI.mock.calls) {
      expect(request.from).toBe('2026-11-09T00:00:00.000Z');
      expect(request.to).toBe('2026-11-09T12:00:00.000Z');
      expect(request.metricTypes).toEqual(['ingest_rate', 'storage_retained']);
    }
  });

  it('should fail the whole request when a batch fails', async () => {
    autoOpsUsageMetricsAPI.mockRejectedValueOnce(new Error('AutoOps is unavailable'));

    await expect(getMetrics(dataStreamNames(150))).rejects.toThrow('AutoOps is unavailable');
  });
});
