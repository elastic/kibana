/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeWith } from 'lodash';

import { MANAGED_OTLP_EXPORTER_DEFAULTS } from '../../../common/constants/output';
import type { OtlpExporterConfig } from '../../../common/types';

import { appContextService } from '..';

export const getManagedOtlpEndpoint = (): string | undefined => {
  return appContextService.getCloud()?.managedOtlp?.url;
};

const normalizeEndpoint = (endpoint: string): string => {
  const withScheme = endpoint.includes('://') ? endpoint : `https://${endpoint}`;
  try {
    const url = new URL(withScheme);
    const path = url.pathname === '/' ? '' : url.pathname;
    return `${url.hostname}${path}`;
  } catch {
    return endpoint.toLowerCase();
  }
};

export const isManagedOtlpEndpoint = (endpoint: string): boolean => {
  const managedUrl = getManagedOtlpEndpoint();
  if (!managedUrl) return false;
  return normalizeEndpoint(endpoint) === normalizeEndpoint(managedUrl);
};

/**
 * Deep-merges managed-OTLP sending_queue defaults into the exporter config when the endpoint
 * points at the managed OTLP service. User-supplied fields win at every level.
 *
 * `sending_queue: null` is the explicit user opt-out (schema allows null | object | undefined).
 * null means "disable queuing entirely" — it is not a defaulted/uninitialized value, so we
 * preserve it as-is. Undefined means "user didn't say anything" → apply managed defaults.
 *
 * Uses lodash mergeWith with an array-replacement customizer (same pattern as otel_collector.ts)
 * so that array values are replaced wholesale rather than concatenated, and nested null values
 * (e.g. `batch: null`) are preserved to disable that sub-block.
 */
export const applyManagedOtlpDefaults = (exporter: OtlpExporterConfig): OtlpExporterConfig => {
  if (!isManagedOtlpEndpoint(exporter.endpoint) || exporter.sending_queue === null) {
    return exporter;
  }
  return {
    ...exporter,
    sending_queue: mergeWith(
      {},
      MANAGED_OTLP_EXPORTER_DEFAULTS.sending_queue,
      exporter.sending_queue,
      // Arrays replace wholesale; a null value disables a nested block (e.g. batch: null).
      (_dst: unknown, src: unknown) => (Array.isArray(src) || src === null ? src : undefined)
    ),
  } as OtlpExporterConfig;
};
