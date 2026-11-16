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

// The distributor locates a processor by its index in the unit document, which is stable because
// the unit is serialized in the order it is traced against here. Compiler errors carry a JSON
// pointer such as `/processors/1/config/0`; schema violations have no pointer and start their
// message with the dotted location instead, `processors.1.config.0...: ...`.
const PROCESSOR_POINTER = /^\/processors\/(\d+)(?:\/|$)/;
const PROCESSOR_LOCATION_PREFIX = /^processors\.(\d+)(?:[.:\s]|$)/;

const readProcessorIndex = (path: string | undefined, message: string): number | undefined => {
  const index = path
    ? PROCESSOR_POINTER.exec(path)?.[1]
    : PROCESSOR_LOCATION_PREFIX.exec(message)?.[1];
  return index === undefined ? undefined : Number(index);
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
export const getProcessingDiagnostics = (
  error: unknown,
  savedUnit: Unit
): ProcessingDiagnostic[] => {
  const processors = savedUnit.unit.processors ?? [];
  return readDiagnostics(error).flatMap((diagnostic) => {
    if (!isRecord(diagnostic) || typeof diagnostic.message !== 'string') {
      return [];
    }
    const { code, message, path } = diagnostic;
    const index = readProcessorIndex(typeof path === 'string' ? path : undefined, message);
    return [
      {
        code: typeof code === 'string' ? code : '',
        message,
        processorId: index === undefined ? undefined : processors[index]?.id,
      },
    ];
  });
};
