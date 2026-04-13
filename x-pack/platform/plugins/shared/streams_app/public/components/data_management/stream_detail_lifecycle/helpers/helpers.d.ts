import type { IlmPolicyDeletePhase, IlmPolicyPhase, IlmPolicyPhases } from '@kbn/streams-schema';
export declare const parseDuration: (duration?: string) => {
    value: number;
    unit: string;
} | undefined;
export declare function parseDurationInSeconds(duration?: string): number;
export declare function orderIlmPhases(phases: IlmPolicyPhases): (IlmPolicyPhase | IlmPolicyDeletePhase)[];
export declare const getILMRatios: (value: {
    phases: IlmPolicyPhases;
} | undefined) => ({
    grow: boolean | 2;
    name: import("@kbn/streams-schema").PhaseName;
    size_in_bytes: number;
    min_age?: string;
    downsample?: import("@kbn/streams-schema/src/models/ingest/lifecycle").DownsampleStep;
    readonly?: boolean;
    searchable_snapshot?: string;
} | {
    grow: boolean | 2;
    name: "delete";
    min_age: string;
    delete_searchable_snapshot?: boolean;
} | {
    grow: 3 | 5 | 2 | 4 | 6 | 7 | 8 | 9 | 10;
    name: import("@kbn/streams-schema").PhaseName;
    size_in_bytes: number;
    min_age?: string;
    downsample?: import("@kbn/streams-schema/src/models/ingest/lifecycle").DownsampleStep;
    readonly?: boolean;
    searchable_snapshot?: string;
} | {
    grow: 3 | 5 | 2 | 4 | 6 | 7 | 8 | 9 | 10;
    name: "delete";
    min_age: string;
    delete_searchable_snapshot?: boolean;
})[] | undefined;
