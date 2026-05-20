import type { z } from '@kbn/zod/v4';
export interface IngestStreamLifecycleDSL {
    dsl: {
        data_retention?: string;
        downsample?: DownsampleStep[];
    };
}
export interface IngestStreamLifecycleILM {
    ilm: {
        policy: string;
    };
}
export interface IngestStreamLifecycleError {
    error: {
        message: string;
    };
}
export interface IngestStreamLifecycleInherit {
    inherit: {};
}
export interface IngestStreamLifecycleDisabled {
    disabled: {};
}
export type IngestStreamLifecycle = IngestStreamLifecycleDSL | IngestStreamLifecycleILM | IngestStreamLifecycleInherit;
export type WiredIngestStreamEffectiveLifecycle = (IngestStreamLifecycleDSL | IngestStreamLifecycleILM) & {
    from: string;
};
export type ClassicIngestStreamEffectiveLifecycle = IngestStreamLifecycle | IngestStreamLifecycleError | IngestStreamLifecycleDisabled;
export type IngestStreamLifecycleAll = IngestStreamLifecycle | IngestStreamLifecycleError | IngestStreamLifecycleDisabled;
export type IngestStreamEffectiveLifecycle = WiredIngestStreamEffectiveLifecycle | ClassicIngestStreamEffectiveLifecycle;
export declare const ingestStreamLifecycleSchema: z.Schema<IngestStreamLifecycle>;
export declare const classicIngestStreamEffectiveLifecycleSchema: z.Schema<ClassicIngestStreamEffectiveLifecycle>;
export declare const wiredIngestStreamEffectiveLifecycleSchema: z.Schema<WiredIngestStreamEffectiveLifecycle>;
export declare const ingestStreamEffectiveLifecycleSchema: z.Schema<IngestStreamEffectiveLifecycle>;
export declare const isDslLifecycle: <TValue extends IngestStreamEffectiveLifecycle>(value: TValue) => value is Extract<TValue, {
    dsl: {
        data_retention?: string | undefined;
        downsample?: {
            after: string;
            fixed_interval: string;
        }[] | undefined;
    };
}>;
export declare const isErrorLifecycle: <TValue extends ClassicIngestStreamEffectiveLifecycle>(value: TValue) => value is Extract<TValue, {
    error: {
        message: string;
    };
}>;
export declare const isIlmLifecycle: <TValue extends IngestStreamEffectiveLifecycle>(value: TValue) => value is Extract<TValue, {
    ilm: {
        policy: string;
    };
}>;
export declare const isInheritLifecycle: <TValue extends IngestStreamEffectiveLifecycle>(value: TValue) => value is Extract<TValue, {
    inherit: Record<string, never>;
}>;
export declare const isDisabledLifecycle: <TValue extends IngestStreamEffectiveLifecycle>(value: TValue) => value is Extract<TValue, {
    disabled: Record<string, never>;
}>;
export type PhaseName = 'hot' | 'warm' | 'cold' | 'frozen' | 'delete';
export interface DownsampleStep {
    after: string;
    fixed_interval: string;
}
export interface IlmPolicyPhase {
    name: PhaseName;
    size_in_bytes: number;
    min_age?: string;
    downsample?: DownsampleStep;
    readonly?: boolean;
    searchable_snapshot?: string;
}
export interface IlmPolicyHotPhase extends IlmPolicyPhase {
    name: 'hot';
    rollover: {
        max_size?: number | string;
        max_primary_shard_size?: number | string;
        max_age?: string;
        max_docs?: number;
        max_primary_shard_docs?: number;
    };
}
export interface IlmPolicyDeletePhase {
    name: 'delete';
    min_age: string;
    delete_searchable_snapshot?: boolean;
}
export interface IlmPolicyPhases {
    hot?: IlmPolicyHotPhase;
    warm?: IlmPolicyPhase;
    cold?: IlmPolicyPhase;
    frozen?: IlmPolicyPhase;
    delete?: IlmPolicyDeletePhase;
}
export interface IlmPolicy {
    name: string;
    phases: IlmPolicyPhases;
    meta?: Record<string, unknown>;
    deprecated?: boolean;
}
export interface IlmPolicyUsage {
    in_use_by: {
        data_streams: string[];
        indices: string[];
    };
}
export type IlmPolicyWithUsage = IlmPolicy & IlmPolicyUsage;
