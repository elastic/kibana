/**
 * This file maintains backward compatibility for the legacy 'logs' stream.
 * It re-exports all OTel-based definitions from logs_otel_layer.ts.
 *
 * The legacy 'logs' stream uses the same OTel structure with normalization,
 * passthrough namespaces, and ECS aliases as 'logs.otel'.
 */
export { otelEquivalentLookupMap, NAMESPACE_PRIORITIES, REQUIRED_RESOURCE_ATTRIBUTES_FIELDS, addAliasesForNamespacedFields, otelLogsSettings as logsSettings, otelBaseFields as baseFields, otelBaseMappings as baseMappings, } from './logs_otel_layer';
