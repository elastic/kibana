/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/server-route-repository-client';
import type { StreamsUnit } from '@kbn/streams-schema';
import type { Unit } from './unit_repository';

/** A distributor diagnostic from a failed save, as the processing flyout shows it. */
export interface ProcessingDiagnostic extends Pick<StreamsUnit.Diagnostic, 'code' | 'message'> {
  /** Processor the diagnostic was traced back to, when it could be. */
  processorId?: string;
  /** Position of that processor in the flyout list, when it belongs to this node. */
  stepIndex?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The distributor reports either `processors.<index>...` (schema violations) or
// `processors > <id>` (compiler errors), in the path or only in the message.
const PROCESSOR_INDEX_PATTERN = /\bprocessors[.[/](\d+)/;
const PROCESSOR_ID_PATTERN = /\bprocessors\s*>\s*([a-z0-9-]+)/;

const traceProcessorId = (text: string, unit: Unit): string | undefined => {
  const processors = unit.unit.processors ?? [];
  const byId = PROCESSOR_ID_PATTERN.exec(text)?.[1];
  if (byId && processors.some(({ id }) => id === byId)) {
    return byId;
  }
  const index = PROCESSOR_INDEX_PATTERN.exec(text)?.[1];
  return index === undefined ? undefined : processors[Number(index)]?.id;
};

/** The diagnostics the streams unit route returns in the body of a rejected save. */
const readDiagnostics = (error: unknown): unknown[] => {
  if (!isHttpFetchError(error)) {
    return [];
  }
  const body: unknown = error.body;
  const attributes = isRecord(body) ? body.attributes : undefined;
  const data = isRecord(attributes) ? attributes.data : undefined;
  return isRecord(data) && Array.isArray(data.diagnostics) ? data.diagnostics : [];
};

/** Distributor diagnostics from a failed unit save, traced back to processors of `savedUnit`. */
export const getProcessingDiagnostics = (error: unknown, savedUnit: Unit): ProcessingDiagnostic[] =>
  readDiagnostics(error).flatMap((diagnostic) => {
    if (!isRecord(diagnostic) || typeof diagnostic.message !== 'string') {
      return [];
    }
    const { code, message, path } = diagnostic;
    return [
      {
        code: typeof code === 'string' ? code : '',
        message,
        processorId: traceProcessorId(
          `${typeof path === 'string' ? path : ''} ${message}`,
          savedUnit
        ),
      },
    ];
  });
