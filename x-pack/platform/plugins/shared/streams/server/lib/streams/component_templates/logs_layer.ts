/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This file maintains backward compatibility for the legacy 'logs' stream.
 * It re-exports all OTel-based definitions from logs_otel_layer.ts.
 *
 * The legacy 'logs' stream uses the same OTel structure with normalization,
 * passthrough namespaces, and ECS aliases as 'logs.otel'.
 */

export {
  otelEquivalentLookupMap,
  NAMESPACE_PRIORITIES,
  REQUIRED_RESOURCE_ATTRIBUTES_FIELDS,
  addAliasesForNamespacedFields,
  // Re-export with legacy names for backward compatibility
  otelLogsSettings as logsSettings,
  otelBaseFields as baseFields,
  otelBaseMappings as baseMappings,
} from './logs_otel_layer';
