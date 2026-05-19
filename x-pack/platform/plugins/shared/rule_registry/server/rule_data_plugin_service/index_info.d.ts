import type { IndexOptions } from './index_options';
interface ConstructorOptions {
    indexOptions: IndexOptions;
    kibanaVersion: string;
}
/**
 * Internal info used by the index bootstrapping logic, reader and writer.
 * Should not be exposed to clients of the library.
 *
 * Names returned by methods of this class should be used in Elasticsearch APIs.
 */
export declare class IndexInfo {
    constructor(options: ConstructorOptions);
    /**
     * Options provided by the plugin/solution defining the index.
     */
    readonly indexOptions: IndexOptions;
    /**
     * Current version of Kibana. We version our index resources and documents based on it.
     * @example '7.16.0'
     */
    readonly kibanaVersion: string;
    /**
     * Base index name, prefixed with the resource prefix.
     * @example '.alerts-security.alerts'
     */
    readonly baseName: string;
    /**
     * Base index pattern. Includes all namespaces of this index.
     * @example '.alerts-security.alerts-*'
     */
    readonly basePattern: string;
    /**
     * Base name for internal backing indices, prefixed with a special prefix.
     * @example '.internal.alerts-security.alerts'
     */
    private readonly baseNameForBackingIndices;
    /**
     * Primary index alias. Includes a namespace.
     * Used as a write target when writing documents to the index.
     * @example '.alerts-security.alerts-default'
     */
    getPrimaryAlias(namespace: string): string;
    /**
     * Optional secondary alias that can be applied to concrete indices in
     * addition to the primary one.
     * @example '.siem-signals-default', null
     */
    getSecondaryAlias(namespace: string): string | null;
    /**
     * Name of the initial concrete index, with the namespace and the ILM suffix.
     * @example '.internal.alerts-security.alerts-default-000001'
     */
    getConcreteIndexInitialName(namespace: string): string;
    /**
     * Index pattern for internal backing indices. Used in the index bootstrapping logic.
     * Can include or exclude the namespace.
     *
     * WARNING: Must not be used for reading documents! If you use it, you should know what you're doing.
     *
     * @example '.internal.alerts-security.alerts-default-*', '.internal.alerts-security.alerts-*'
     */
    getPatternForBackingIndices(namespace?: string): string;
    /**
     * Index pattern that should be used when reading documents from the index.
     * Can include or exclude the namespace.
     *
     * IMPORTANT: The namespace is user-defined in general. Because of that, when
     * reading data from the index, we want to do this by default:
     *   - pass namespace = undefined
     *   - search over all the namespaces
     *   - include nested registration contexts eagerly
     *   - e.g. if baseName='.alerts-observability', include '.alerts-observability.apm'
     *
     * @example '.alerts-security.alerts-default', '.alerts-security.alerts*'
     */
    getPatternForReading(namespace?: string): string;
    /**
     * Name of the custom ILM policy (if it's provided by the plugin/solution).
     * Specific to the index. Shared between all namespaces of the index.
     * @example '.alerts-security.alerts-policy'
     */
    getIlmPolicyName(): string;
    /**
     * Full name of a component template.
     * @example '.alerts-security.alerts-mappings'
     */
    getComponentTemplateName(relativeName: string): string;
    /**
     * Full name of the index template. Each namespace gets its own template.
     * @example '.alerts-security.alerts-default-index-template'
     */
    getIndexTemplateName(namespace: string): string;
}
export {};
