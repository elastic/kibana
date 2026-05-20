import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { StreamlangDSL } from '@kbn/streamlang';
import type { StreamlangResolverOptions } from '@kbn/streamlang/types/resolvers';
/**
 * Builds ingest pipeline processors for simulation runs.
 *
 * This is identical to normal transpilation, except it injects simulation-only no-op processors
 * (set + remove of a temporary field) *under each condition block* (tagged with the condition
 * customIdentifier), so simulation metrics can compute condition match rates even if there are
 * no descendants or descendants are faulty.
 *
 * The set processor is tagged with the condition ID for metric tracking. Using set+remove instead
 * of a painless script avoids compilation overhead and works even without painless enabled.
 *
 * These processors are never exposed as steps in the UI; they exist only in the ES `_simulate` request.
 */
export declare function buildSimulationProcessorsWithConditionNoops(processing: StreamlangDSL, resolverOptions?: StreamlangResolverOptions): Promise<NonNullable<IngestProcessorContainer>[]>;
