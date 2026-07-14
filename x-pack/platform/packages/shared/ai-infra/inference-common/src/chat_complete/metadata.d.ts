import type { Attributes } from '@opentelemetry/api';
/**
 * Set of metadata that can be used then calling the inference APIs
 *
 * @public
 */
export interface ChatCompleteMetadata {
    connectorTelemetry?: ConnectorTelemetryMetadata;
    anonymization?: ChatCompleteAnonymizationMetadata;
    attributes?: Attributes;
}
/**
 * Pass through for the connector telemetry
 */
export interface ConnectorTelemetryMetadata {
    pluginId?: string;
    aggregateBy?: string;
}
export interface ChatCompleteAnonymizationTarget {
    targetType: 'data_view' | 'index_pattern' | 'index';
    targetId: string;
}
/**
 * Optional anonymization metadata consumers can pass so inference can resolve
 * field-based policy for a target.
 */
export interface ChatCompleteAnonymizationMetadata {
    profileId?: string;
    replacementsId?: string;
    target?: ChatCompleteAnonymizationTarget;
}
