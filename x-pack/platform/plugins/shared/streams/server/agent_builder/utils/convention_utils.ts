/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { isOtelStream } from '@kbn/streams-schema';

export type FieldConvention = 'otel' | 'ecs';

export const getStreamConvention = (definition: Streams.all.Definition): FieldConvention => {
  return isOtelStream(definition) ? 'otel' : 'ecs';
};

export const getConventionHint = (convention: FieldConvention): string => {
  return convention === 'otel'
    ? 'OTel naming convention. Custom/extracted fields use attributes.*, body.structured.*, or resource.attributes.* namespaces. Do not suggest mapping or renaming fields outside these namespaces.'
    : 'ECS naming convention. Fields follow Elastic Common Schema (e.g. host.name, log.level, service.name).';
};
