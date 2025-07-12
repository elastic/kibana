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

export function getPhoenixConfig(): { baseUrl: string; headers: { Authorization: string } } {
  const config = loadConfiguration([], REPO_ROOT, false);

  const phoenixExporter = castArray(config.getTelemetryConfig()?.tracing?.exporters ?? []).flatMap(
    (exporter) => {
      const variant = fromExternalVariant(exporter);
      if (variant.type === 'phoenix') {
        return [variant.value];
      }
      return [];
    }
  )[0];

  if (!phoenixExporter) {
    throw new Error('Could not find a valid configuration for Phoenix');
  }

  return {
    baseUrl: phoenixExporter.base_url,
    headers: {
      Authorization: `Bearer ${phoenixExporter.api_key}`,
    },
  };
}
