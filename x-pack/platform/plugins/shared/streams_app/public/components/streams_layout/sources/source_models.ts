/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveSourceCapabilities, type SourceEnvironment } from './source_helpers';
import type {
  ConfiguredSource,
  SourceApiKey,
  SourceRuntimeMetadata,
  SourceStatus,
  SourceType,
  SourceViewModel,
} from './types';

export const createConfiguredSource = ({
  id,
  name,
  type,
}: {
  id: string;
  name: string;
  type: SourceType;
}): ConfiguredSource => ({ id, name, type, to: null });

export const createRuntimeMetadata = (
  source: ConfiguredSource,
  environment: SourceEnvironment
): SourceRuntimeMetadata => {
  const { endpoint, endpoints } = resolveSourceCapabilities({
    type: source.type,
    sourceId: source.id,
    ...environment,
  });
  return {
    endpoint,
    endpoints,
    destinations: [],
  };
};

export const createSourceViewModel = ({
  source,
  metadata,
  status,
  apiKeys,
}: {
  source: ConfiguredSource;
  metadata: SourceRuntimeMetadata;
  status: SourceStatus;
  apiKeys: SourceApiKey[];
}): SourceViewModel => ({
  ...source,
  ...metadata,
  status,
  apiKeys,
});
