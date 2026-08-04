import { z } from '@kbn/zod/v4';
/**
 * List of internal / built-in attachment types.
 *
 * The list is not fixed, as contributors can add their own attachment types.
 */
export declare enum AttachmentType {
    screenContext = "screen_context",
    text = "text",
    esql = "esql",
    connector = "connector"
}
interface AttachmentDataMap {
    [AttachmentType.esql]: EsqlAttachmentData;
    [AttachmentType.text]: TextAttachmentData;
    [AttachmentType.screenContext]: ScreenContextAttachmentData;
    [AttachmentType.connector]: ConnectorAttachmentData;
}
export declare const esqlAttachmentDataSchema: z.ZodObject<{
    query: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Data for an esql attachment.
 */
export interface EsqlAttachmentData {
    /** the esql query */
    query: string;
    /** optional description of the query */
    description?: string;
}
export declare const textAttachmentDataSchema: z.ZodObject<{
    content: z.ZodString;
}, z.core.$strip>;
/**
 * Data for a text attachment.
 */
export interface TextAttachmentData {
    /** text content of the attachment */
    content: string;
}
export declare const screenContextTimeRangeSchema: z.ZodObject<{
    from: z.ZodString;
    to: z.ZodString;
}, z.core.$strip>;
export interface TimeRange {
    from: string;
    to: string;
}
export declare const screenContextAttachmentDataSchema: z.ZodObject<{
    url: z.ZodOptional<z.ZodString>;
    app: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    time_range: z.ZodOptional<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
    }, z.core.$strip>>;
    additional_data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, z.core.$strip>;
/**
 * Data for a screen context attachment.
 */
export interface ScreenContextAttachmentData {
    /** current url */
    url?: string;
    /** kibana app name */
    app?: string;
    /** app description */
    description?: string;
    /** the currently active time range */
    time_range?: TimeRange;
    /** arbitrary additional context data */
    additional_data?: Record<string, string>;
}
/**
 * Tag prefix used to associate tools with their parent connector instance.
 * A tool tagged `connector:<connectorId>` belongs to that connector.
 */
export declare const CONNECTOR_TAG_PREFIX = "connector:";
export declare const connectorAttachmentDataSchema: z.ZodObject<{
    connector_id: z.ZodString;
    connector_name: z.ZodString;
    connector_type: z.ZodString;
}, z.core.$strip>;
/**
 * Data for a connector attachment.
 */
export interface ConnectorAttachmentData {
    /** The saved connector instance ID */
    connector_id: string;
    /** Human-readable connector name */
    connector_name: string;
    /** Action type ID (e.g., ".slack2", ".mcp") */
    connector_type: string;
}
export type AttachmentDataOf<Type extends AttachmentType> = AttachmentDataMap[Type];
export {};
