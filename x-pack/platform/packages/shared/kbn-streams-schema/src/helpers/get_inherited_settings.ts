/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IngestStreamSettings,
  WiredIngestStreamEffectiveSettings,
} from '../models/ingest/settings';
import type { Streams } from '../models/streams';

export const getInheritedSettings = (
  ancestors: Streams.WiredStream.Definition[]
): WiredIngestStreamEffectiveSettings => {
  return ancestors.reduce((acc, def) => {
    Object.entries(def.ingest.settings).forEach(([key, value]) => {
      acc[key] = { ...value, from: def.name };
    });

    return acc;
  }, {} as Record<string, WiredIngestStreamEffectiveSettings[keyof IngestStreamSettings]>);
};
