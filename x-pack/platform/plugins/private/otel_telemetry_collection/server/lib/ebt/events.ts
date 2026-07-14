/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@elastic/ebt/client';
import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type { OtelPerServicePayload } from '../services/types';

const keywordArraySchema = (description: string) => ({
  type: 'array' as const,
  items: {
    type: 'keyword' as const,
    _meta: { description },
  },
  _meta: { description },
});

export const OTEL_PER_SERVICE_EVENT: EventTypeOpts<OtelPerServicePayload> = {
  eventType: 'otel_per_service_stats',
  schema: {
    batch_index: {
      type: 'long',
      _meta: { description: '0-based index of this event within the batch' },
    },
    batch_total: {
      type: 'long',
      _meta: { description: 'Total number of events in this batch' },
    },
    results: {
      type: 'array',
      items: {
        properties: {
          signal: {
            type: 'keyword',
            _meta: { description: 'Signal type: traces, metrics, or logs' },
          },
          service_id: {
            type: 'keyword',
            _meta: {
              description: 'Raw service.name value',
            },
          },
          environment: {
            type: 'keyword',
            _meta: {
              description: 'deployment.environment value, or empty string if missing',
            },
          },
          doc_count: {
            type: 'long',
            _meta: { description: 'Document count for this service+env in this signal index' },
          },
          sdk_names: keywordArraySchema('telemetry.sdk.name values'),
          sdk_languages: keywordArraySchema('telemetry.sdk.language values'),
          sdk_versions: keywordArraySchema('telemetry.sdk.version values'),
          distro_names: keywordArraySchema('telemetry.distro.name values'),
          distro_versions: keywordArraySchema('telemetry.distro.version values'),
          cloud_providers: keywordArraySchema('cloud.provider values'),
          cloud_platforms: keywordArraySchema('cloud.platform values'),
          cloud_regions: keywordArraySchema('cloud.region values'),
          cloud_az: keywordArraySchema('cloud.availability_zone values'),
          host_archs: keywordArraySchema('host.arch values'),
          os_types: keywordArraySchema('os.type values'),
          os_names: keywordArraySchema('os.name values'),
          os_versions: keywordArraySchema('os.version values'),
          os_descriptions: keywordArraySchema('os.description values'),
          device_manufacturers: keywordArraySchema('device.manufacturer values'),
          device_model_names: keywordArraySchema('device.model.name values'),
          browser_platforms: keywordArraySchema('browser.platform values'),
          user_agent_originals: keywordArraySchema('user_agent.original values'),
          runtime_names: keywordArraySchema('process.runtime.name values'),
          runtime_versions: keywordArraySchema('process.runtime.version values'),
          runtime_descriptions: keywordArraySchema('process.runtime.description values'),
          executable_names: keywordArraySchema('process.executable.name values'),
          webengine_names: keywordArraySchema('webengine.name values'),
          webengine_versions: keywordArraySchema('webengine.version values'),
          webengine_descriptions: keywordArraySchema('webengine.description values'),
          scope_names: keywordArraySchema('scope.name values (capped at 50)'),
          upstream_cluster: keywordArraySchema('attributes.upstream.cluster values'),
          has_k8s: {
            type: 'boolean',
            _meta: { description: 'True if any k8s.* resource attribute is present' },
          },
          has_container: {
            type: 'boolean',
            _meta: { description: 'True if any container.* resource attribute is present' },
          },
        },
      },
      _meta: {
        description: 'Array of per-service+environment OTel resource attribute summaries',
      },
    },
  },
};

export const registerOtelEbtEvents = (analytics: AnalyticsServiceSetup) => {
  analytics.registerEventType(OTEL_PER_SERVICE_EVENT);
};
