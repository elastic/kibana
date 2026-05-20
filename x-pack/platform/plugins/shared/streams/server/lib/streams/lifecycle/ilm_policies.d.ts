import type { IlmPhases as EsIlmPhases } from '@elastic/elasticsearch/lib/api/types';
import type { IlmPolicy, IlmPolicyUsage } from '@kbn/streams-schema';
interface IlmPolicyEntry {
    policy?: {
        phases?: EsIlmPhases;
        _meta?: Record<string, unknown>;
        deprecated?: boolean;
    };
    modified_date?: string;
    version?: number;
    in_use_by?: {
        indices?: string[];
        data_streams?: string[];
    };
}
export interface IlmPoliciesResponse {
    [policyName: string]: IlmPolicyEntry;
}
export declare const buildPolicyUsage: (policyEntry: IlmPolicyEntry, dataStreamByBackingIndices?: Record<string, string>) => IlmPolicyUsage;
export declare const normalizeIlmPhases: (phases?: EsIlmPhases) => IlmPolicy["phases"];
export {};
