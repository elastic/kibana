/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * @jest-environment node
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { MetricNode, XyChartNode } from '@kbn/isomer';
import { metricExamples, xyChartExamples } from '@kbn/isomer';
import type { PngEvent } from '../instrumentation/events';
import { RenderBusyError } from './limiter';
import { PNG_LIMITS, RenderInputError, createChartPngHost } from './png_host';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const metric = metricExamples[0].node as MetricNode;
const xy = xyChartExamples[0].node as XyChartNode;

describe('createChartPngHost', () => {
  const report = jest.fn<void, [PngEvent]>();
  const host = createChartPngHost({ logger: loggingSystemMock.createLogger(), report });

  afterAll(() => host.close());

  it('loads nothing until the first render', () => {
    expect(host.loaded).toEqual({ runtime: false, engine: false });
  });

  it('draws an xy chart to a PNG with headless Elastic Charts and reports what it cost', async () => {
    const { png, width, height, scale, metrics } = await host.renderPng(xy, { scheme: 'dark' });
    expect(png.subarray(0, 8)).toEqual(PNG_SIGNATURE);
    expect(scale).toBe(2);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    expect(png.readUInt32BE(16)).toBe(Math.round(width * scale));
    expect(host.loaded).toEqual({ runtime: true, engine: true });
    expect(metrics).toEqual(
      expect.objectContaining({
        node_type: 'xyChart',
        png_bytes: png.byteLength,
        engine_loaded: true,
      })
    );
    expect(report).toHaveBeenCalledWith(metrics);
  }, 60_000);

  it('draws a metric, in the locale and time zone it is given, at no more than 2×', async () => {
    const { png, scale, metrics } = await host.renderPng(metric, {
      locale: 'de',
      timeZone: 'Europe/Berlin',
      scale: 3,
    });
    expect(png.subarray(0, 8)).toEqual(PNG_SIGNATURE);
    expect(scale).toBe(PNG_LIMITS.maxScale);
    expect(metrics.engine_loaded).toBe(false);
  }, 60_000);

  it('refuses a node over the PNG input budget before drawing it', async () => {
    const rows = Array.from({ length: 20_000 }, (_, index) => [index, index]);
    const huge: XyChartNode = {
      type: 'xyChart',
      data: {
        columns: [
          { id: 'x', label: 'x', type: 'number', role: 'dimension' },
          { id: 'y', label: 'y', type: 'number', role: 'metric' },
        ],
        rows,
      },
      layers: [{ kind: 'data', mark: 'line', x: 'x', y: [{ column: 'y' }] }],
    };
    await expect(host.renderPng(huge)).rejects.toBeInstanceOf(RenderInputError);
  });

  it('runs two renders at once and refuses past the queue', async () => {
    const renders = Array.from({ length: PNG_LIMITS.inFlight + PNG_LIMITS.queued + 1 }, () =>
      host.renderPng(metric, { scale: 1 })
    );
    const results = await Promise.allSettled(renders);
    const refused = results.filter(
      (result) => result.status === 'rejected' && result.reason instanceof RenderBusyError
    );
    expect(refused).toHaveLength(1);
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      PNG_LIMITS.inFlight + PNG_LIMITS.queued
    );
  }, 120_000);
});
