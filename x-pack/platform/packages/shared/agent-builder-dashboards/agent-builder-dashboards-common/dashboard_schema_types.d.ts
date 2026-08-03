import { z } from '@kbn/zod/v4';
/**
 * Grid dimensions (in dashboard grid units) for layout.
 * Dashboard grid is 48 columns wide; height is in same units.
 */
export declare const panelGridSchema: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
    w: z.ZodNumber;
    h: z.ZodNumber;
}, z.core.$strip>;
/**
 * Zod schema for dashboard panel entries.
 * The `type` field contains the actual embeddable type.
 */
declare const attachmentPanelSchema: z.ZodObject<{
    type: z.ZodString;
    id: z.ZodString;
    config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    grid: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        w: z.ZodNumber;
        h: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export type AttachmentPanel = z.infer<typeof attachmentPanelSchema>;
export declare const sectionGridSchema: z.ZodObject<{
    y: z.ZodNumber;
}, z.core.$strip>;
declare const dashboardSectionSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    collapsed: z.ZodBoolean;
    grid: z.ZodObject<{
        y: z.ZodNumber;
    }, z.core.$strip>;
    panels: z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        id: z.ZodString;
        config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        grid: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            w: z.ZodNumber;
            h: z.ZodNumber;
        }, z.core.$strip>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type DashboardSection = z.infer<typeof dashboardSectionSchema>;
export declare const isSection: (widget: AttachmentPanel | DashboardSection) => widget is DashboardSection;
export declare const timeRangeSchema: z.ZodObject<{
    from: z.ZodString;
    to: z.ZodString;
    mode: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"absolute">, z.ZodLiteral<"relative">]>>;
}, z.core.$strip>;
/**
 * Zod schema for dashboard attachment data.
 * This schema matches the structure of DashboardState from @kbn/dashboard-plugin.
 */
export declare const dashboardAttachmentDataSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    panels: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodString;
        id: z.ZodString;
        config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        grid: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            w: z.ZodNumber;
            h: z.ZodNumber;
        }, z.core.$strip>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        collapsed: z.ZodBoolean;
        grid: z.ZodObject<{
            y: z.ZodNumber;
        }, z.core.$strip>;
        panels: z.ZodArray<z.ZodObject<{
            type: z.ZodString;
            id: z.ZodString;
            config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
            grid: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
                w: z.ZodNumber;
                h: z.ZodNumber;
            }, z.core.$strip>;
        }, z.core.$strip>>;
    }, z.core.$strip>]>>;
    query: z.ZodOptional<z.ZodObject<{
        expression: z.ZodUnion<readonly [z.ZodString, z.ZodRecord<z.ZodString, z.ZodUnknown>]>;
        language: z.ZodString;
    }, z.core.$strip>>;
    time_range: z.ZodOptional<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
        mode: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"absolute">, z.ZodLiteral<"relative">]>>;
    }, z.core.$strip>>;
    refresh_interval: z.ZodOptional<z.ZodObject<{
        pause: z.ZodBoolean;
        value: z.ZodNumber;
    }, z.core.$strip>>;
    filters: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    options: z.ZodOptional<z.ZodObject<{
        auto_apply_filters: z.ZodOptional<z.ZodBoolean>;
        hide_panel_titles: z.ZodOptional<z.ZodBoolean>;
        hide_panel_borders: z.ZodOptional<z.ZodBoolean>;
        use_margins: z.ZodOptional<z.ZodBoolean>;
        sync_colors: z.ZodOptional<z.ZodBoolean>;
        sync_tooltips: z.ZodOptional<z.ZodBoolean>;
        sync_cursor: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    pinned_panels: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    access_control: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        access_mode: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"write_restricted">, z.ZodLiteral<"default">]>>;
    }, z.core.$strip>>>;
    project_routing: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type DashboardAttachmentData = z.infer<typeof dashboardAttachmentDataSchema>;
export {};
