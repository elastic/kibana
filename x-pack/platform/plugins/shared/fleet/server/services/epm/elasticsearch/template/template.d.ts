import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Field } from '../../fields/field';
import type { RegistryDataStream, IndexTemplateEntry, IndexTemplate, IndexTemplateMappings, RegistryElasticsearch } from '../../../../types';
export interface IndexTemplateMapping {
    [key: string]: any;
}
export interface CurrentDataStream {
    dataStreamName: string;
    replicated: boolean;
    indexTemplate: IndexTemplate;
    currentWriteIndex: string;
}
export declare const NAMESPACE_TEMPLATE_PRIORITY_BOOST = 50;
/**
 * getTemplate retrieves the default template but overwrites the index pattern with the given value.
 *
 * @param indexPattern String with the index pattern
 */
export declare function getTemplate({ templateIndexPattern, packageName, composedOfTemplates, templatePriority, hidden, registryElasticsearch, isIndexModeTimeSeries, type, isOtelInputType, }: {
    templateIndexPattern: string;
    packageName: string;
    composedOfTemplates: string[];
    templatePriority: number;
    type: string;
    hidden?: boolean;
    registryElasticsearch?: RegistryElasticsearch | undefined;
    isIndexModeTimeSeries?: boolean;
    isOtelInputType?: boolean;
}): IndexTemplate;
/**
 * Generate mapping takes the given nested fields array and creates the Elasticsearch
 * mapping properties out of it.
 *
 * This assumes that all fields with dotted.names have been expanded in a previous step.
 *
 * @param fields
 */
export declare function generateMappings(fields: Field[], isIndexModeTimeSeries?: boolean): IndexTemplateMappings;
/**
 * Generates the template name out of the given information
 */
export declare function generateTemplateName(dataStream: RegistryDataStream): string;
export declare function generateTemplateIndexPattern(dataStream: RegistryDataStream, isOtelInputType?: boolean): string;
export declare function getTemplatePriority(dataStream: RegistryDataStream): number;
/**
 * Returns the index template name for a namespace-scoped template.
 * Example: `logs-nginx.access@namespace.production`
 */
export declare function generateNamespaceTemplateName(baseName: string, namespace: string): string;
/**
 * Returns the index pattern for a namespace-scoped template.
 *
 * The pattern matches the data stream name exactly (no trailing wildcard on the
 * namespace segment) so that namespaces with shared prefixes do not collide —
 * e.g. the template for namespace `production` must not also match data streams
 * for `production_eu` or `production_us`.
 *
 * Example (non-prefix): `logs-nginx.access-production`
 * Example (dataset_is_prefix): `metrics-test.*-production`
 * Example (OTel): `traces-generic.otel-production`
 */
export declare function generateNamespaceTemplateIndexPattern(dataStream: RegistryDataStream, namespace: string, isOtelInputType?: boolean): string;
/**
 * Returns the priority for a namespace-scoped index template.
 * Always higher than the base template so ES picks it for matching data streams.
 *
 * Note: for data streams with `dataset_is_prefix: true`, the base template priority is 150
 * and the namespace template priority is 200 — the same numeric value as a regular base
 * template. This is intentional: Elasticsearch resolves priority ties by index pattern
 * specificity, so the more specific namespace pattern (e.g. `metrics-test.*-production`)
 * wins over the regular base pattern (e.g. `metrics-test.*-*`) even at equal priority.
 */
export declare function getNamespaceTemplatePriority(dataStream: RegistryDataStream): number;
/**
 * Returns true if the given template ID is a namespace-scoped index template,
 * identifiable by the `@namespace.` discriminator in the name.
 */
export declare function isNamespaceTemplate(id: string): boolean;
/**
 * Extracts the namespace from a namespace-scoped template ID.
 * Returns undefined if the ID is not a namespace template.
 * Example: `logs-nginx.access@namespace.production` → `'production'`
 */
export declare function getNamespaceFromTemplateId(id: string): string | undefined;
/**
 * Returns a map of the data stream path fields to elasticsearch index pattern.
 * @param dataStreams an array of RegistryDataStream objects
 */
export declare function generateESIndexPatterns(dataStreams: RegistryDataStream[] | undefined): Record<string, string>;
export declare const updateCurrentWriteIndices: (esClient: ElasticsearchClient, logger: Logger, templates: IndexTemplateEntry[], options?: {
    ignoreMappingUpdateErrors?: boolean;
    skipDataStreamRollover?: boolean;
}) => Promise<void>;
