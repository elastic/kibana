import { z } from '@kbn/zod/v4';
export declare const DashboardAttachmentMetadataSchema: z.ZodObject<{
    title: z.ZodString;
    soType: z.ZodLiteral<"dashboard">;
}, z.core.$strict>;
/**
 * Structural subset of the `DashboardAttachmentData` API shape from
 * `@kbn/agent-builder-dashboards-common`. Declared inline here (rather than
 * importing the upstream Zod schema as a value) so the public bundle doesn't
 * drag in the upstream package's converters and their transitive
 * `@kbn/lens-embeddable-utils` + `@kbn/lens-common` dependencies (~3.8 MB on
 * the eager `cases` page-load bundle).
 *
 * `.loose()` (passthrough) is used on purpose: the dashboard embed forwards
 * the whole blob to `attachmentDataToDashboardState`, which accepts any
 * fields the dashboard renderer understands. The listed fields below are the
 * minimum structural surface cases relies on / guards against drift, not an
 * exhaustive contract.
 *
 * The compile-time tripwire `DashboardConfigMatchesAttachmentData` lives in
 * `public/components/attachments/dashboard/dashboard_embed_attachment.tsx`
 * (where the upstream type is reachable) and fails typecheck if upstream
 * drops or renames any of the fields we forward here.
 */
export declare const DashboardConfigSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    panels: z.ZodArray<z.ZodUnknown>;
    query: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    time_range: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    refresh_interval: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    filters: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    options: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    pinned_panels: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    access_control: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    project_routing: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
/**
 * `config` is required when `data` is present so the renderer can always embed
 * inline; `timeRange` is an optional override on top of the snapshot.
 */
export declare const DashboardAttachmentDataSchema: z.ZodObject<{
    config: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        panels: z.ZodArray<z.ZodUnknown>;
        query: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        time_range: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        refresh_interval: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        filters: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
        options: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        pinned_panels: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
        access_control: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        project_routing: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>;
    timeRange: z.ZodOptional<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
        mode: z.ZodOptional<z.ZodEnum<{
            absolute: "absolute";
            relative: "relative";
        }>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const DashboardAttachmentPayloadSchema: z.ZodObject<{
    type: z.ZodLiteral<"dashboard">;
    owner: z.ZodString;
    attachmentId: z.ZodString;
    metadata: z.ZodObject<{
        title: z.ZodString;
        soType: z.ZodLiteral<"dashboard">;
    }, z.core.$strict>;
    data: z.ZodOptional<z.ZodObject<{
        config: z.ZodObject<{
            title: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            panels: z.ZodArray<z.ZodUnknown>;
            query: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            time_range: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            refresh_interval: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            filters: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
            options: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            pinned_panels: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
            access_control: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            project_routing: z.ZodOptional<z.ZodString>;
        }, z.core.$loose>;
        timeRange: z.ZodOptional<z.ZodObject<{
            from: z.ZodString;
            to: z.ZodString;
            mode: z.ZodOptional<z.ZodEnum<{
                absolute: "absolute";
                relative: "relative";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type DashboardConfig = z.infer<typeof DashboardConfigSchema>;
export type DashboardAttachmentData = z.infer<typeof DashboardAttachmentDataSchema>;
export type DashboardAttachmentMetadata = z.infer<typeof DashboardAttachmentMetadataSchema>;
export type DashboardAttachmentPayload = z.infer<typeof DashboardAttachmentPayloadSchema>;
