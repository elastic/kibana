/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { TimeRangeValue } from '../../common/types';

export type CellStatus = 'idle' | 'stale' | 'running' | 'done' | 'error' | 'blocked';

/** A value bound to a named ES|QL param; `null` marks an empty input and is sent as JSON null. */
export type ParamValue = string | number | null;

export type ParamMap = Readonly<Record<string, ParamValue>>;

/** The user's current choice for an input cell. Runtime-only; only defaults persist. */
export type InputValue =
  | { kind: 'time'; range: TimeRangeValue }
  | { kind: 'dropdown'; value: string | null }
  | { kind: 'range'; value: [number, number] | null };

export type CellOutput =
  | { kind: 'table'; table: Datatable; truncated: boolean }
  | { kind: 'input'; params: ParamMap; options?: string[] };

export interface CellRuntime {
  status: CellStatus;
  output?: CellOutput;
  error?: string;
  lastRunAt?: number;
  durationMs?: number;
  memoKey?: string;
}

export interface RunQueryArgs {
  query: string;
  params: ParamMap;
  signal: AbortSignal;
}

export interface RunQueryResult {
  table: Datatable;
  durationMs: number;
  truncated: boolean;
}

export type RunQuery = (args: RunQueryArgs) => Promise<RunQueryResult>;
