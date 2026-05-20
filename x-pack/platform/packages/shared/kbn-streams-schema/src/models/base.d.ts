import type { z } from '@kbn/zod/v4';
import type { OmitUpsertProps } from './core';
import type { StreamQuery } from '../queries';
export declare namespace BaseStream {
    interface QueryStreamReference {
        name: string;
    }
    interface Definition {
        name: string;
        description: string;
        updated_at: string;
        /**
         * Child query streams that belong to this stream.
         * Names must follow the parent.childname naming convention.
         */
        query_streams?: QueryStreamReference[];
    }
    type Source<TDefinition extends Definition = Definition> = TDefinition;
    interface GetResponse<TDefinition extends Definition = Definition> {
        dashboards: string[];
        rules: string[];
        stream: TDefinition;
        queries: StreamQuery[];
    }
    interface UpsertRequest<TDefinition extends Definition = Definition> {
        dashboards: string[];
        rules: string[];
        stream: OmitUpsertProps<TDefinition>;
        queries: StreamQuery[];
    }
    interface Model {
        Definition: BaseStream.Definition;
        Source: BaseStream.Source;
        GetResponse: BaseStream.GetResponse;
        UpsertRequest: BaseStream.UpsertRequest;
    }
}
export declare const baseStreamDefinitionSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    updated_at: z.ZodISODateTime;
    query_streams: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const baseStreamGetResponseSchema: z.ZodObject<{
    dashboards: z.ZodArray<z.ZodString>;
    rules: z.ZodArray<z.ZodString>;
    queries: z.ZodArray<z.ZodType<StreamQuery, unknown, z.core.$ZodTypeInternals<StreamQuery, unknown>>>;
}, z.core.$strip>;
export declare const baseStreamUpsertRequestSchema: z.ZodObject<{
    dashboards: z.ZodArray<z.ZodString>;
    rules: z.ZodArray<z.ZodString>;
    queries: z.ZodArray<z.ZodType<StreamQuery, unknown, z.core.$ZodTypeInternals<StreamQuery, unknown>>>;
}, z.core.$strip>;
export declare const baseStreamUpsertDefinitionSchema: z.ZodObject<{
    description: z.ZodString;
    query_streams: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>;
