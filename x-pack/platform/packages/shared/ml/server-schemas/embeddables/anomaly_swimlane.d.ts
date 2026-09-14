import { z } from '@kbn/zod/v4';
export declare const anomalySwimLaneOverallSchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    hide_title: z.ZodOptional<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
    hide_border: z.ZodOptional<z.ZodBoolean>;
    time_range: z.ZodOptional<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
        mode: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"absolute">, z.ZodLiteral<"relative">]>>;
    }, z.core.$strict>>;
    job_ids: z.ZodArray<z.ZodString>;
    per_page: z.ZodOptional<z.ZodNumber>;
    severity_threshold: z.ZodOptional<z.ZodNumber>;
    swimlane_type: z.ZodLiteral<"overall">;
}, z.core.$strip>;
export declare const anomalySwimLaneViewBySchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    hide_title: z.ZodOptional<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
    hide_border: z.ZodOptional<z.ZodBoolean>;
    time_range: z.ZodOptional<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
        mode: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"absolute">, z.ZodLiteral<"relative">]>>;
    }, z.core.$strict>>;
    job_ids: z.ZodArray<z.ZodString>;
    per_page: z.ZodOptional<z.ZodNumber>;
    severity_threshold: z.ZodOptional<z.ZodNumber>;
    swimlane_type: z.ZodLiteral<"viewBy">;
    view_by: z.ZodString;
}, z.core.$strip>;
export declare const anomalySwimLaneEmbeddableStateSchema: z.ZodUnion<readonly [z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    hide_title: z.ZodOptional<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
    hide_border: z.ZodOptional<z.ZodBoolean>;
    time_range: z.ZodOptional<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
        mode: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"absolute">, z.ZodLiteral<"relative">]>>;
    }, z.core.$strict>>;
    job_ids: z.ZodArray<z.ZodString>;
    per_page: z.ZodOptional<z.ZodNumber>;
    severity_threshold: z.ZodOptional<z.ZodNumber>;
    swimlane_type: z.ZodLiteral<"overall">;
}, z.core.$strip>, z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    hide_title: z.ZodOptional<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
    hide_border: z.ZodOptional<z.ZodBoolean>;
    time_range: z.ZodOptional<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
        mode: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"absolute">, z.ZodLiteral<"relative">]>>;
    }, z.core.$strict>>;
    job_ids: z.ZodArray<z.ZodString>;
    per_page: z.ZodOptional<z.ZodNumber>;
    severity_threshold: z.ZodOptional<z.ZodNumber>;
    swimlane_type: z.ZodLiteral<"viewBy">;
    view_by: z.ZodString;
}, z.core.$strip>]>;
export type AnomalySwimLaneEmbeddableState = z.output<typeof anomalySwimLaneEmbeddableStateSchema>;
export type SwimlaneType = AnomalySwimLaneEmbeddableState['swimlane_type'];
