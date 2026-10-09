import { z } from '@kbn/zod/v4';
export declare const ALERT_EPISODE_STATUS: {
    readonly INACTIVE: 'inactive';
    readonly PENDING: 'pending';
    readonly ACTIVE: 'active';
    readonly RECOVERING: 'recovering';
};
export type AlertEpisodeStatus = (typeof ALERT_EPISODE_STATUS)[keyof typeof ALERT_EPISODE_STATUS];
export declare enum ALERT_EPISODE_ACTION_TYPE {
    ACK = "ack",
    UNACK = "unack",
    ASSIGN = "assign",
    TAG = "tag",
    SNOOZE = "snooze",
    UNSNOOZE = "unsnooze",
    ACTIVATE = "activate",
    DEACTIVATE = "deactivate"
}
export type AlertEpisodeActionType = (typeof ALERT_EPISODE_ACTION_TYPE)[keyof typeof ALERT_EPISODE_ACTION_TYPE];
/**
 * Action types that target an alert series as a whole, identified by `group_hash`.
 */
export declare const SERIES_ALERT_ACTION_TYPES: readonly [ALERT_EPISODE_ACTION_TYPE.SNOOZE, ALERT_EPISODE_ACTION_TYPE.UNSNOOZE];
export type SeriesAlertActionType = (typeof SERIES_ALERT_ACTION_TYPES)[number];
/**
 * Action types that target one specific episode, identified by `episode_id`.
 */
export declare const EPISODE_ALERT_ACTION_TYPES: readonly [ALERT_EPISODE_ACTION_TYPE.TAG, ALERT_EPISODE_ACTION_TYPE.ACK, ALERT_EPISODE_ACTION_TYPE.UNACK, ALERT_EPISODE_ACTION_TYPE.ASSIGN, ALERT_EPISODE_ACTION_TYPE.ACTIVATE, ALERT_EPISODE_ACTION_TYPE.DEACTIVATE];
export type EpisodeAlertActionType = (typeof EPISODE_ALERT_ACTION_TYPES)[number];
export declare const createSeriesAlertActionBodySchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.SNOOZE>;
    snoozed_until: z.ZodOptional<z.ZodISODateTime>;
}, z.core.$strict>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.UNSNOOZE>;
}, z.core.$strict>], "action_type">;
export type CreateSeriesAlertActionBody = z.infer<typeof createSeriesAlertActionBodySchema>;
export declare const createEpisodeAlertActionBodySchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.TAG>;
    tags: z.ZodArray<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.ACK>;
}, z.core.$strict>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.UNACK>;
}, z.core.$strict>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.ASSIGN>;
    assignee_uid: z.ZodNullable<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.ACTIVATE>;
    reason: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.DEACTIVATE>;
    reason: z.ZodString;
}, z.core.$strict>], "action_type">;
export type CreateEpisodeAlertActionBody = z.infer<typeof createEpisodeAlertActionBodySchema>;
export declare const seriesAlertActionParamsSchema: z.ZodObject<{
    group_hash: z.ZodString;
}, z.core.$strict>;
export type SeriesAlertActionParams = z.infer<typeof seriesAlertActionParamsSchema>;
export declare const episodeAlertActionParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strict>;
export type EpisodeAlertActionParams = z.infer<typeof episodeAlertActionParamsSchema>;
export declare const createSnoozeSeriesActionBodySchema: z.ZodObject<{
    snoozed_until: z.ZodOptional<z.ZodISODateTime>;
}, z.core.$strict>;
export type CreateSnoozeSeriesActionBody = z.infer<typeof createSnoozeSeriesActionBodySchema>;
export declare const createUnsnoozeSeriesActionBodySchema: z.ZodObject<{}, z.core.$strict>;
export type CreateUnsnoozeSeriesActionBody = z.infer<typeof createUnsnoozeSeriesActionBodySchema>;
export declare const createTagEpisodeActionBodySchema: z.ZodObject<{
    tags: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export type CreateTagEpisodeActionBody = z.infer<typeof createTagEpisodeActionBodySchema>;
export declare const createAckEpisodeActionBodySchema: z.ZodObject<{}, z.core.$strict>;
export type CreateAckEpisodeActionBody = z.infer<typeof createAckEpisodeActionBodySchema>;
export declare const createUnackEpisodeActionBodySchema: z.ZodObject<{}, z.core.$strict>;
export type CreateUnackEpisodeActionBody = z.infer<typeof createUnackEpisodeActionBodySchema>;
export declare const createAssignEpisodeActionBodySchema: z.ZodObject<{
    assignee_uid: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export type CreateAssignEpisodeActionBody = z.infer<typeof createAssignEpisodeActionBodySchema>;
export declare const createActivateEpisodeActionBodySchema: z.ZodObject<{
    reason: z.ZodString;
}, z.core.$strict>;
export type CreateActivateEpisodeActionBody = z.infer<typeof createActivateEpisodeActionBodySchema>;
export declare const createDeactivateEpisodeActionBodySchema: z.ZodObject<{
    reason: z.ZodString;
}, z.core.$strict>;
export type CreateDeactivateEpisodeActionBody = z.infer<typeof createDeactivateEpisodeActionBodySchema>;
export declare const bulkSnoozeSeriesActionItemSchema: z.ZodObject<{
    snoozed_until: z.ZodOptional<z.ZodISODateTime>;
    group_hash: z.ZodString;
}, z.core.$strict>;
export type BulkSnoozeSeriesActionItem = z.infer<typeof bulkSnoozeSeriesActionItemSchema>;
export declare const bulkSnoozeSeriesActionBodySchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        snoozed_until: z.ZodOptional<z.ZodISODateTime>;
        group_hash: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type BulkSnoozeSeriesActionBody = z.infer<typeof bulkSnoozeSeriesActionBodySchema>;
export declare const bulkUnsnoozeSeriesActionItemSchema: z.ZodObject<{
    group_hash: z.ZodString;
}, z.core.$strict>;
export type BulkUnsnoozeSeriesActionItem = z.infer<typeof bulkUnsnoozeSeriesActionItemSchema>;
export declare const bulkUnsnoozeSeriesActionBodySchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        group_hash: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type BulkUnsnoozeSeriesActionBody = z.infer<typeof bulkUnsnoozeSeriesActionBodySchema>;
export declare const bulkTagEpisodeActionItemSchema: z.ZodObject<{
    tags: z.ZodArray<z.ZodString>;
    alert_id: z.ZodString;
}, z.core.$strict>;
export type BulkTagEpisodeActionItem = z.infer<typeof bulkTagEpisodeActionItemSchema>;
export declare const bulkTagEpisodeActionBodySchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        tags: z.ZodArray<z.ZodString>;
        alert_id: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type BulkTagEpisodeActionBody = z.infer<typeof bulkTagEpisodeActionBodySchema>;
export declare const bulkAckEpisodeActionItemSchema: z.ZodObject<{
    alert_id: z.ZodString;
}, z.core.$strict>;
export type BulkAckEpisodeActionItem = z.infer<typeof bulkAckEpisodeActionItemSchema>;
export declare const bulkAckEpisodeActionBodySchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        alert_id: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type BulkAckEpisodeActionBody = z.infer<typeof bulkAckEpisodeActionBodySchema>;
export declare const bulkUnackEpisodeActionItemSchema: z.ZodObject<{
    alert_id: z.ZodString;
}, z.core.$strict>;
export type BulkUnackEpisodeActionItem = z.infer<typeof bulkUnackEpisodeActionItemSchema>;
export declare const bulkUnackEpisodeActionBodySchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        alert_id: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type BulkUnackEpisodeActionBody = z.infer<typeof bulkUnackEpisodeActionBodySchema>;
export declare const bulkAssignEpisodeActionItemSchema: z.ZodObject<{
    assignee_uid: z.ZodNullable<z.ZodString>;
    alert_id: z.ZodString;
}, z.core.$strict>;
export type BulkAssignEpisodeActionItem = z.infer<typeof bulkAssignEpisodeActionItemSchema>;
export declare const bulkAssignEpisodeActionBodySchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        assignee_uid: z.ZodNullable<z.ZodString>;
        alert_id: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type BulkAssignEpisodeActionBody = z.infer<typeof bulkAssignEpisodeActionBodySchema>;
export declare const bulkActivateEpisodeActionItemSchema: z.ZodObject<{
    reason: z.ZodString;
    alert_id: z.ZodString;
}, z.core.$strict>;
export type BulkActivateEpisodeActionItem = z.infer<typeof bulkActivateEpisodeActionItemSchema>;
export declare const bulkActivateEpisodeActionBodySchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        reason: z.ZodString;
        alert_id: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type BulkActivateEpisodeActionBody = z.infer<typeof bulkActivateEpisodeActionBodySchema>;
export declare const bulkDeactivateEpisodeActionItemSchema: z.ZodObject<{
    reason: z.ZodString;
    alert_id: z.ZodString;
}, z.core.$strict>;
export type BulkDeactivateEpisodeActionItem = z.infer<typeof bulkDeactivateEpisodeActionItemSchema>;
export declare const bulkDeactivateEpisodeActionBodySchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        reason: z.ZodString;
        alert_id: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type BulkDeactivateEpisodeActionBody = z.infer<typeof bulkDeactivateEpisodeActionBodySchema>;
/**
 * Internal item shapes consumed by the alert actions client. Routes inject
 * the fixed `action_type` of their verb into each request item before
 * calling the client, so these are not request schemas.
 */
export type BulkCreateSeriesAlertActionItemBody = CreateSeriesAlertActionBody & {
    group_hash: string;
};
export type BulkCreateEpisodeAlertActionItemBody = CreateEpisodeAlertActionBody & {
    alert_id: string;
};
/**
 * Union of every alert action body across both scopes. Used by the
 * server-side handler layer, which dispatches on `action_type` regardless
 * of the scope the action came in through.
 */
export type CreateAlertActionBody = CreateSeriesAlertActionBody | CreateEpisodeAlertActionBody;
