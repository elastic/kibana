/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';

const PAGE_SIZE = 4096;
const ONE_MIB = 1024 * 1024;
const MAX_LATENCY_MS = 60_000;
const LIGHT_PATH = '/api/task_manager/_heap_profile_experiment/light';
const HEAVY_PATH = '/api/task_manager/_heap_profile_experiment/heavy';
const LIGHT_DEFAULT_BYTES = 4096;
const LIGHT_MAX_BYTES = ONE_MIB;
const HEAVY_DEFAULT_BYTES = 50 * ONE_MIB;
const HEAVY_MAX_BYTES = 256 * ONE_MIB;
const HEAVY_DEFAULT_LATENCY_MS = 2000;
const BYTES_PER_OBJECT = 64;

const integer = (value: number): string | undefined =>
  Number.isInteger(value) ? undefined : 'must be an integer';

const latencySchema = (defaultValue: number) =>
  schema.number({
    min: 0,
    max: MAX_LATENCY_MS,
    defaultValue,
    validate: integer,
  });

const bytesSchema = (defaultValue: number, max: number) =>
  schema.number({
    min: 0,
    max,
    defaultValue,
    validate: integer,
  });

const AUTHZ = {
  enabled: false as const,
  reason:
    'Experiment load endpoint that allocates process memory and returns no tenant or task data.',
};

export interface HeapProfileExperimentResponse {
  route: string;
  latency: number;
  bytes: number;
  elapsedMs: number;
}

const allocateWorkload = (bytes: number): { buffer: Buffer; objects: Array<{ i: number }> } => {
  const bufferBytes = Math.floor(bytes / 2);
  const heapBytes = bytes - bufferBytes;
  const buffer = Buffer.alloc(bufferBytes);
  for (let offset = 0; offset < buffer.length; offset += PAGE_SIZE) {
    buffer[offset] = 1;
  }
  const objectCount = heapBytes > 0 ? Math.max(1, Math.floor(heapBytes / BYTES_PER_OBJECT)) : 0;
  const objects: Array<{ i: number }> = new Array(objectCount);
  for (let i = 0; i < objectCount; i++) {
    objects[i] = { i };
  }
  return { buffer, objects };
};

const runExperiment = async (
  route: string,
  latency: number,
  bytes: number
): Promise<HeapProfileExperimentResponse> => {
  const started = process.hrtime.bigint();
  const held = allocateWorkload(bytes);
  if (latency > 0) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, latency);
    });
  }
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  // Keep allocations live across the wait, then drop them with the locals.
  void held.buffer.length;
  void held.objects.length;
  return { route, latency, bytes, elapsedMs };
};

export function heapProfileExperimentRoutes({ router }: { router: IRouter }): void {
  router.get(
    {
      path: LIGHT_PATH,
      security: { authz: AUTHZ },
      options: {
        access: 'public',
        summary: 'Heap profile experiment light load',
      },
      validate: {
        query: schema.object({
          latency: latencySchema(0),
          bytes: bytesSchema(LIGHT_DEFAULT_BYTES, LIGHT_MAX_BYTES),
        }),
      },
    },
    async (_context, request, response) => {
      const body = await runExperiment(LIGHT_PATH, request.query.latency, request.query.bytes);
      return response.ok({ body });
    }
  );

  router.get(
    {
      path: HEAVY_PATH,
      security: { authz: AUTHZ },
      options: {
        access: 'public',
        summary: 'Heap profile experiment heavy load',
      },
      validate: {
        query: schema.object({
          latency: latencySchema(HEAVY_DEFAULT_LATENCY_MS),
          bytes: bytesSchema(HEAVY_DEFAULT_BYTES, HEAVY_MAX_BYTES),
        }),
      },
    },
    async (_context, request, response) => {
      const body = await runExperiment(HEAVY_PATH, request.query.latency, request.query.bytes);
      return response.ok({ body });
    }
  );
}
