/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestStreamSettings } from '@kbn/streams-schema/src/models/ingest/settings';

export function formatSettings(settings: IngestStreamSettings, isServerless: boolean) {
  if (isServerless) {
    return {
      'index.refresh_interval': settings['index.refresh_interval']?.value ?? null,
    };
  }

  return {
    'index.number_of_replicas': settings['index.number_of_replicas']?.value ?? null,
    'index.number_of_shards': settings['index.number_of_shards']?.value ?? null,
    'index.refresh_interval': settings['index.refresh_interval']?.value ?? null,
  };
}
