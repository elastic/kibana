import type { IlmPolicyPhases } from '@kbn/streams-schema';
import type { IlmExplainLifecycleLifecycleExplain, IlmPolicy, IndicesStatsIndicesStats } from '@elastic/elasticsearch/lib/api/types';
export declare function ilmPhases({ policy, indicesIlmDetails, indicesStats, }: {
    policy: IlmPolicy;
    indicesIlmDetails: Record<string, IlmExplainLifecycleLifecycleExplain>;
    indicesStats: Record<string, IndicesStatsIndicesStats>;
}): IlmPolicyPhases;
