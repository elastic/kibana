/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidDataStreamIndexPattern } from '@kbn/fleet-plugin/common';
import type { AwsServiceMatrixEntry } from '../aws_service_matrix';

const OTELCOL_INPUT = 'otelcol';

/**
 * Returns the index patterns for a service entry.
 * Each data stream with a known dataset produces a pattern of the form
 * `<type>-<dataset>-<namespace>`. The namespace falls back to `*` when none is given or when the
 * has_data route would reject the resulting pattern.
 * Falls back to `logs-<packageName>.*-*` when the manifest doesn't expose the dataset field.
 *
 * OTel entries (`dataFormat === 'otel'`) use service-specific OTel data streams:
 * - ECF OTel log services (`ecfLogType` set): dataset is `aws.<ecfLogType>.otel`, type is `logs`.
 *   ECF has no namespace, so these always use `*`.
 * - OTel input packages (e.g. `aws_cloudwatch_input_otel`): dataset and type are read from
 *   the `data_stream.dataset` / `data_stream.type` variable defaults in `varDefsByInput`.
 *
 * ECS-derived `dsInfo.dataset` values are intentionally ignored for OTel entries — they come
 * from aliased ECS policy templates and do not reflect the OTel destination data streams.
 */
export function getServiceIndexPatterns(
  entry: AwsServiceMatrixEntry,
  namespace?: string
): string[] {
  const patterns: string[] = [];

  if (entry.dataFormat === 'otel' && entry.ecfLogType) {
    // Each ECF OTel log service writes to its own data stream: logs-aws.<ecfLogType>.otel-*
    patterns.push(`logs-aws.${entry.ecfLogType}.otel-*`);
  } else if (entry.varDefsByDataStream) {
    for (const [, dsInfo] of Object.entries(entry.varDefsByDataStream)) {
      // OTel input packages (e.g. aws_cloudwatch_input_otel) store the actual data stream
      // coordinates as variable defaults under varDefsByInput rather than at the top level.
      const baseDataset =
        entry.dataFormat === 'otel'
          ? getInputVarDefault(dsInfo.varDefsByInput, 'data_stream.dataset')
          : dsInfo.dataset;
      // Data ingested through the `otelcol` input lands in `<dataset>.otel`, not in the manifest default.
      const dataset =
        baseDataset && dsInfo.inputs.includes(OTELCOL_INPUT) && !baseDataset.endsWith('.otel')
          ? `${baseDataset}.otel`
          : baseDataset;
      const type = dsInfo.type;
      if (dataset && type) {
        const concrete = `${type}-${dataset}-${namespace}`;
        patterns.push(
          namespace && isValidDataStreamIndexPattern(concrete) ? concrete : `${type}-${dataset}-*`
        );
      }
    }
  }

  if (patterns.length === 0) {
    patterns.push(`logs-${entry.packageName}.*-*`);
  }

  return [...new Set(patterns)];
}

function getInputVarDefault(
  varDefsByInput: Record<string, Record<string, any>>,
  varName: string
): string | undefined {
  for (const varDefs of Object.values(varDefsByInput)) {
    const val = varDefs[varName]?.default;
    if (typeof val === 'string') return val;
  }
  return undefined;
}
