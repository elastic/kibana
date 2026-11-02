/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATASET_VAR_NAME } from '../../../common/constants';

import type { PackagePolicyInputStream } from '../../types';

/** Resolves `data_stream.dataset` stream var for otelcol; invalid shapes yield undefined. */
export function extractOtelDatasetVarOverride(raw: unknown): string | undefined {
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed !== '' ? trimmed : undefined;
  }
  if (typeof raw === 'object' && raw !== null && 'dataset' in raw) {
    const d = (raw as { dataset: unknown }).dataset;
    if (typeof d === 'string') {
      const trimmed = d.trim();
      return trimmed !== '' ? trimmed : undefined;
    }
    return undefined;
  }
  return undefined;
}

/**
 * Effective `data_stream.dataset` for otelcol streams: merge `stream.data_stream` with
 * `compiled_stream.data_stream` (same object spread as `getFullInputStreams`), then apply
 * `data_stream.dataset` when the stream var resolves (aligns permissions and full agent policy).
 */
export function getEffectiveOtelStreamDataset(stream: PackagePolicyInputStream): string {
  const fromVar = extractOtelDatasetVarOverride(stream.vars?.[DATASET_VAR_NAME]?.value);
  if (fromVar !== undefined) {
    return fromVar;
  }
  const merged = {
    ...stream.data_stream,
    ...stream.compiled_stream?.data_stream,
  };
  return merged.dataset ?? stream.data_stream.dataset ?? '';
}
