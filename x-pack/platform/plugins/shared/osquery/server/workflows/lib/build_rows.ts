/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { RunQueryOutput } from '../../../common/workflows/step_types/run_query/run_query_common';

export type ResultRow = RunQueryOutput['rows'][number];

const readPath = (source: Record<string, unknown>, path: string): unknown =>
  path in source ? source[path] : get(source, path);

const isLeafValue = (value: unknown): boolean =>
  value !== null && value !== undefined && (typeof value !== 'object' || Array.isArray(value));

/**
 * Reads an `ecs_mapping` key. A key naming a multi-field (`host.os.name.text`, used by prebuilt
 * saved queries) is never in `_source`: its value is the parent field's.
 */
const readEcsValue = (source: Record<string, unknown>, key: string): unknown => {
  const value = readPath(source, key);
  if (value !== undefined) return value;

  const lastDot = key.lastIndexOf('.');
  if (lastDot <= 0) return undefined;
  const parent = readPath(source, key.slice(0, lastDot));

  return isLeafValue(parent) ? parent : undefined;
};

/** Column values are strings; an object or array keeps its content instead of `[object Object]`. */
const toColumnValue = (value: unknown): string =>
  value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value);

const toColumns = (source: Record<string, unknown>): Record<string, string> => {
  const columns: Record<string, string> = {};
  const nested = source.osquery;
  if (nested && typeof nested === 'object') {
    Object.entries(nested as Record<string, unknown>).forEach(([key, value]) => {
      columns[key] = toColumnValue(value);
    });
  }

  Object.entries(source).forEach(([key, value]) => {
    if (key.startsWith('osquery.')) {
      columns[key.slice('osquery.'.length)] = toColumnValue(value);
    }
  });

  return columns;
};

/** One result document to one row. `ecs` holds only the keys of the query's `ecs_mapping`. */
export const buildRow = (source: Record<string, unknown>, ecsKeys: string[]): ResultRow => {
  const agent = (readPath(source, 'agent') ?? {}) as { id?: string; name?: string };
  const agentId = agent.id ?? (readPath(source, 'agent.id') as string | undefined) ?? '';
  const agentName = agent.name ?? (readPath(source, 'agent.name') as string | undefined);
  const timestamp = source['@timestamp'];

  const ecs: Record<string, unknown> = {};
  ecsKeys.forEach((key) => {
    const value = readEcsValue(source, key);
    if (value !== undefined) {
      ecs[key] = value;
    }
  });

  return {
    agent: { id: agentId, ...(agentName ? { name: agentName } : {}) },
    ...(timestamp ? { '@timestamp': String(timestamp) } : {}),
    columns: toColumns(source),
    ecs,
  };
};
