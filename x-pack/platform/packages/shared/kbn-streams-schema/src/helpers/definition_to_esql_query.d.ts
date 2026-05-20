import { type Condition } from '@kbn/streamlang';
import type { WiredStream } from '../models/ingest/wired';
export interface DefinitionToESQLQueryOptions {
    definition: WiredStream.Definition;
    routingCondition: Condition;
    inheritedFields?: Record<string, {
        type?: string;
    }>;
    /**
     * When false, omits processing steps from the generated query.
     * Field-type casts (schema reflections) are always included since
     * they are the read-time equivalent of index mappings. Use this to
     * obtain a query suitable for fetching pre-processing samples
     * (e.g. on the Processing tab). Defaults to true.
     */
    includeProcessing?: boolean;
}
/**
 * Assembles an ES|QL query string for a draft stream's ES|QL view.
 *
 * Draft streams use read-time ES|QL views instead of ingest pipelines.
 * The generated query reads from the parent stream's view, filters by
 * the routing condition, and applies processing steps.
 *
 * The query does NOT include session-level directives like
 * `SET unmapped_fields="LOAD"` because they are not supported in
 * ES|QL view definitions — consumers should apply those at query time.
 *
 * OTel mapping aliases (e.g. message, trace.id) and passthrough
 * namespace resolution (e.g. attributes.host.name → host.name) are
 * handled by Elasticsearch at the index level when the parent view
 * reads from the underlying indices, so no explicit EVALs are needed.
 */
export declare function definitionToESQLQuery(options: DefinitionToESQLQueryOptions): Promise<string>;
