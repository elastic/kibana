/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import { loadConfiguration } from '@kbn/apm-config-loader';
import { REPO_ROOT } from '@kbn/repo-info';
import { fromExternalVariant } from '@kbn/std';

export interface PhoenixConfig {
  baseUrl: string;
  headers?: Record<string, string>;
}

export function getPhoenixConfig(): PhoenixConfig {
  // Prefer explicit env vars for local Phoenix runs (e.g. `node scripts/phoenix`).
  // This is important because the eval executor runs in the Playwright worker process,
  // not inside Kibana, so it cannot "see" Kibana CLI flags used by Scout.
  const envBaseUrl =
    process.env.PHOENIX_BASE_URL ??
    process.env.PHOENIX_URL ??
    (process.env.PHOENIX_HOST && process.env.PHOENIX_PORT
      ? `http://${process.env.PHOENIX_HOST}:${process.env.PHOENIX_PORT}`
      : undefined);

  if (envBaseUrl) {
    const apiKey = process.env.PHOENIX_API_KEY ?? process.env.PHOENIX_SECRET;
    return {
      baseUrl: envBaseUrl,
      // Local phoenix commonly has auth disabled; headers are optional.
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    };
  }

  const config = loadConfiguration([], REPO_ROOT, false);

  const phoenixExporter = castArray(config.getTelemetryConfig().tracing.exporters).flatMap(
    (exporter) => {
      const variant = fromExternalVariant(exporter);
      if (variant.type === 'phoenix') {
        return [variant.value];
      }
      return [];
    }
  )[0];

  if (!phoenixExporter) {
    throw new Error(
      'Could not find a valid configuration for Phoenix. ' +
        'Set PHOENIX_BASE_URL (and optionally PHOENIX_API_KEY) to run the Phoenix executor locally.'
    );
  }

  const apiKey = phoenixExporter.api_key;

  return {
    baseUrl: phoenixExporter.base_url,
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
  };
}
