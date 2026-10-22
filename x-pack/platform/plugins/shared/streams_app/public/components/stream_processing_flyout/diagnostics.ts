/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/server-route-repository-client';
import type { Unit } from '../../services/unit_repository';
import type { ProcessingDiagnostic } from './state_management/processing_flyout_machine';

interface RawDiagnostic {
  code?: unknown;
  message?: unknown;
  path?: unknown;
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

/** Distributor diagnostics from a failed unit save, traced back to processors of `savedUnit`. */
export const getProcessingDiagnostics = (
  error: unknown,
  savedUnit: Unit
): ProcessingDiagnostic[] => {
  if (!isHttpFetchError(error)) {
    return [];
  }
  const body: unknown = error.body;
  const attributes = isRecord(body) ? body.attributes : undefined;
  const data = isRecord(attributes) ? attributes.data : undefined;
  const diagnostics = isRecord(data) && Array.isArray(data.diagnostics) ? data.diagnostics : [];
  return diagnostics.flatMap((diagnostic: RawDiagnostic) => {
    if (!isRecord(diagnostic) || typeof diagnostic.message !== 'string') {
      return [];
    }
    const path = typeof diagnostic.path === 'string' ? diagnostic.path : '';
    return [
      {
        code: typeof diagnostic.code === 'string' ? diagnostic.code : '',
        message: diagnostic.message,
        processorId: traceProcessorId(`${path} ${diagnostic.message}`, savedUnit),
      },
    ];
  });
};
