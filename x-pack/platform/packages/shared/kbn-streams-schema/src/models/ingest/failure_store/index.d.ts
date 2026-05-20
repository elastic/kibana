import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import type { z } from '@kbn/zod/v4';
export interface FailureStoreStatsResponse {
    size?: number;
    count?: number;
    creationDate?: number;
}
export interface FailureStoreInherit {
    inherit: {};
}
export interface FailureStoreDisabled {
    disabled: {};
}
export interface FailureStoreEnabledWithLifecycle {
    lifecycle: {
        enabled: {
            data_retention?: string;
        };
    };
}
export interface FailureStoreEnabledWithoutLifecycle {
    lifecycle: {
        disabled: {};
    };
}
type EffectiveFailureStoreEnabledWithLifecycle = FailureStoreEnabledWithLifecycle & {
    lifecycle: {
        enabled: {
            is_default_retention: boolean;
        };
    };
};
export type FailureStoreEnabled = FailureStoreEnabledWithLifecycle | FailureStoreEnabledWithoutLifecycle;
export type EffectiveFailureStoreEnabled = EffectiveFailureStoreEnabledWithLifecycle | FailureStoreEnabledWithoutLifecycle;
export type EffectiveFailureStore = FailureStoreDisabled | EffectiveFailureStoreEnabled;
export type FailureStore = FailureStoreInherit | FailureStoreEnabled | FailureStoreDisabled;
export type WiredIngestStreamEffectiveFailureStore = EffectiveFailureStore & {
    from: string;
};
export declare const enabledWithLifecycleFailureStoreSchema: z.ZodObject<{
    lifecycle: z.ZodObject<{
        enabled: z.ZodObject<{
            data_retention: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const effectiveFailureStoreSchema: z.Schema<EffectiveFailureStore>;
export declare const enabledFailureStoreSchema: z.Schema<FailureStoreEnabled>;
export declare const failureStoreSchema: z.Schema<FailureStore>;
export declare const failureStoreStatsSchema: z.Schema<FailureStoreStatsResponse>;
export declare const wiredIngestStreamEffectiveFailureStoreSchema: z.Schema<WiredIngestStreamEffectiveFailureStore>;
export declare const isEnabledLifecycleFailureStore: (input: EffectiveFailureStore | FailureStore) => input is FailureStoreEnabledWithLifecycle | EffectiveFailureStoreEnabledWithLifecycle;
export declare const isDisabledLifecycleFailureStore: (input: EffectiveFailureStore | FailureStore) => input is FailureStoreEnabledWithoutLifecycle;
export declare const isEnabledFailureStore: (input: EffectiveFailureStore | FailureStore) => input is FailureStoreEnabled | EffectiveFailureStoreEnabled;
export declare function isInheritFailureStore(input: FailureStore): input is FailureStoreInherit;
export declare const isDisabledFailureStore: (input: FailureStore) => input is FailureStoreDisabled;
export type DataStreamWithFailureStore = IndicesDataStream & {
    failure_store: {
        enabled?: boolean;
        lifecycle?: {
            enabled?: boolean;
            data_retention?: string;
            effective_retention?: string;
            retention_determined_by?: 'default_failures_retention' | 'data_stream_configuration';
        };
    };
};
export {};
