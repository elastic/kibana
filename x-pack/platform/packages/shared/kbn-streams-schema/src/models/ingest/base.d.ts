import type { z } from '@kbn/zod/v4';
import type { Validation } from '../validation/validation';
import type { IngestStreamLifecycle } from './lifecycle';
import type { BaseStream } from '../base';
import type { IngestStreamSettings } from './settings';
import type { FailureStore } from './failure_store';
import type { IngestStreamProcessing } from './processing';
import type { StrictOmit } from '../core';
interface IngestStreamPrivileges {
    manage: boolean;
    monitor: boolean;
    view_index_metadata: boolean;
    lifecycle: boolean;
    simulate: boolean;
    text_structure: boolean;
    read_failure_store: boolean;
    manage_failure_store: boolean;
    create_snapshot_repository: boolean;
}
export interface IngestBase {
    lifecycle: IngestStreamLifecycle;
    processing: IngestStreamProcessing;
    settings: IngestStreamSettings;
    failure_store: FailureStore;
}
export declare const ingestBaseSchemaFields: {
    lifecycle: z.ZodType<IngestStreamLifecycle, unknown, z.core.$ZodTypeInternals<IngestStreamLifecycle, unknown>>;
    processing: z.ZodObject<{
        steps: z.ZodArray<z.ZodType<import("@kbn/streamlang/types/streamlang").StreamlangStep, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang/types/streamlang").StreamlangStep, unknown>>>;
        updated_at: z.ZodISODateTime;
    }, z.core.$strip>;
    settings: z.ZodType<IngestStreamSettings, unknown, z.core.$ZodTypeInternals<IngestStreamSettings, unknown>>;
    failure_store: z.ZodType<FailureStore, unknown, z.core.$ZodTypeInternals<FailureStore, unknown>>;
};
export declare const ingestBaseUpsertSchemaFields: {
    processing: z.ZodObject<{
        steps: z.ZodArray<z.ZodType<import("@kbn/streamlang/types/streamlang").StreamlangStep, unknown, z.core.$ZodTypeInternals<import("@kbn/streamlang/types/streamlang").StreamlangStep, unknown>>>;
        updated_at: z.ZodOptional<z.ZodUndefined>;
    }, z.core.$strip>;
    lifecycle: z.ZodType<IngestStreamLifecycle, unknown, z.core.$ZodTypeInternals<IngestStreamLifecycle, unknown>>;
    settings: z.ZodType<IngestStreamSettings, unknown, z.core.$ZodTypeInternals<IngestStreamSettings, unknown>>;
    failure_store: z.ZodType<FailureStore, unknown, z.core.$ZodTypeInternals<FailureStore, unknown>>;
};
export declare const IngestBase: Validation<unknown, IngestBase>;
type OmitIngestBaseUpsertProps<T extends {
    processing: Omit<IngestStreamProcessing, 'updated_at'> & {
        updated_at?: string;
    };
}> = Omit<T, 'processing'> & {
    processing: StrictOmit<IngestBase['processing'], 'updated_at'>;
};
export type IngestBaseUpsertRequest = OmitIngestBaseUpsertProps<IngestBase>;
export declare const IngestBaseUpsertRequest: Validation<unknown, IngestBaseUpsertRequest>;
export type IngestStreamIndexMode = 'standard' | 'time_series' | 'logsdb' | 'lookup';
export declare namespace IngestBaseStream {
    interface Definition extends BaseStream.Definition {
        ingest: IngestBase;
    }
    type Source<TDefinition extends IngestBaseStream.Definition = IngestBaseStream.Definition> = BaseStream.Source<TDefinition>;
    interface GetResponse<TDefinition extends IngestBaseStream.Definition = IngestBaseStream.Definition> extends BaseStream.GetResponse<TDefinition> {
        privileges: IngestStreamPrivileges;
        index_mode?: IngestStreamIndexMode;
        replicated?: boolean;
    }
    type UpsertRequest<TDefinition extends OmitIngestBaseStreamUpsertProps<IngestBaseStream.Definition> = OmitIngestBaseStreamUpsertProps<IngestBaseStream.Definition>> = BaseStream.UpsertRequest<TDefinition>;
    interface Model {
        Definition: IngestBaseStream.Definition;
        Source: IngestBaseStream.Source;
        GetResponse: IngestBaseStream.GetResponse;
        UpsertRequest: IngestBaseStream.UpsertRequest;
    }
}
type OmitIngestBaseStreamUpsertProps<T extends {
    ingest: Omit<IngestBase, 'processing'> & {
        processing: Omit<IngestBase['processing'], 'updated_at'> & {
            updated_at?: string;
        };
    };
}> = Omit<T, 'ingest'> & {
    ingest: Omit<IngestBase, 'processing'> & {
        processing: Omit<IngestBase['processing'], 'updated_at'> & {
            updated_at?: never;
        };
    };
};
export declare const ingestBaseStreamDefinitionSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    updated_at: z.ZodISODateTime;
    query_streams: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>>>;
    ingest: z.ZodType<IngestBase, unknown, z.core.$ZodTypeInternals<IngestBase, unknown>>;
}, z.core.$strip>;
export declare const ingestBaseStreamGetResponseSchema: z.ZodObject<{
    dashboards: z.ZodArray<z.ZodString>;
    rules: z.ZodArray<z.ZodString>;
    queries: z.ZodArray<z.ZodType<import("../../queries").StreamQuery, unknown, z.core.$ZodTypeInternals<import("../../queries").StreamQuery, unknown>>>;
    stream: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        updated_at: z.ZodISODateTime;
        query_streams: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>>>;
        ingest: z.ZodType<IngestBase, unknown, z.core.$ZodTypeInternals<IngestBase, unknown>>;
    }, z.core.$strip>;
    privileges: z.ZodType<IngestStreamPrivileges, unknown, z.core.$ZodTypeInternals<IngestStreamPrivileges, unknown>>;
    index_mode: z.ZodOptional<z.ZodType<IngestStreamIndexMode, unknown, z.core.$ZodTypeInternals<IngestStreamIndexMode, unknown>>>;
    replicated: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const ingestBaseStreamUpsertDefinitionSchema: z.ZodObject<{
    description: z.ZodString;
    query_streams: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>>>;
    ingest: z.ZodType<IngestBaseUpsertRequest, unknown, z.core.$ZodTypeInternals<IngestBaseUpsertRequest, unknown>>;
}, z.core.$strip>;
export declare const ingestBaseStreamUpsertRequestSchema: z.ZodObject<{
    dashboards: z.ZodArray<z.ZodString>;
    rules: z.ZodArray<z.ZodString>;
    queries: z.ZodArray<z.ZodType<import("../../queries").StreamQuery, unknown, z.core.$ZodTypeInternals<import("../../queries").StreamQuery, unknown>>>;
    stream: z.ZodObject<{
        description: z.ZodString;
        query_streams: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
        }, z.core.$strip>>>;
        ingest: z.ZodType<IngestBaseUpsertRequest, unknown, z.core.$ZodTypeInternals<IngestBaseUpsertRequest, unknown>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export {};
