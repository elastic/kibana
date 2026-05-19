import type { IlmGetLifecycleLifecycle } from '@elastic/elasticsearch/lib/api/types';
export declare const DATA_STREAM_TYPES_DEPRECATED_ILMS: string[];
export declare function getILMPolicies(dataStreamTypes: string[]): Promise<Map<string, {
    deprecatedILMPolicy?: IlmGetLifecycleLifecycle;
    newILMPolicy?: IlmGetLifecycleLifecycle;
}>>;
export declare function saveILMMigrationChanges(updatedILMMigrationStatusMap: Map<string, 'success' | undefined | null>): Promise<void>;
export declare function getILMMigrationStatus(): Promise<Map<string, 'success' | undefined | null>>;
export declare function getILMPolicy(type: string, ilmMigrationStatusMap: Map<string, 'success' | undefined | null>, ilmPolicies: Map<string, {
    deprecatedILMPolicy?: IlmGetLifecycleLifecycle;
    newILMPolicy?: IlmGetLifecycleLifecycle;
}>): string;
export declare function buildDefaultSettings({ ilmPolicy, type, isOtelInputType, ilmMigrationStatusMap, }: {
    type: string;
    ilmPolicy?: string | undefined;
    isOtelInputType?: boolean;
    ilmMigrationStatusMap: Map<string, 'success' | undefined | null>;
}): {
    index: {
        lifecycle?: undefined;
    };
} | {
    index: {
        lifecycle: {
            name: string;
        };
    };
};
