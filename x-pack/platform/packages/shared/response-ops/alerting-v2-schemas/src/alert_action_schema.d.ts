import { z } from '@kbn/zod/v4';
export declare enum ALERT_EPISODE_STATUS {
    INACTIVE = "inactive",
    PENDING = "pending",
    ACTIVE = "active",
    RECOVERING = "recovering"
}
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
export declare const createAckAlertActionBodySchema: z.ZodObject<{
    episode_id: z.ZodString;
}, z.core.$strict>;
export type CreateAckAlertActionBody = z.infer<typeof createAckAlertActionBodySchema>;
export declare const createUnackAlertActionBodySchema: z.ZodObject<{
    episode_id: z.ZodString;
}, z.core.$strict>;
export type CreateUnackAlertActionBody = z.infer<typeof createUnackAlertActionBodySchema>;
export declare const createAssignAlertActionBodySchema: z.ZodObject<{
    episode_id: z.ZodString;
    assignee_uid: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export type CreateAssignAlertActionBody = z.infer<typeof createAssignAlertActionBodySchema>;
export declare const createTagAlertActionBodySchema: z.ZodObject<{
    tags: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export type CreateTagAlertActionBody = z.infer<typeof createTagAlertActionBodySchema>;
export declare const createSnoozeAlertActionBodySchema: z.ZodObject<{
    expiry: z.ZodOptional<z.ZodISODateTime>;
}, z.core.$strict>;
export type CreateSnoozeAlertActionBody = z.infer<typeof createSnoozeAlertActionBodySchema>;
export declare const createUnsnoozeAlertActionBodySchema: z.ZodObject<{}, z.core.$strict>;
export type CreateUnsnoozeAlertActionBody = z.infer<typeof createUnsnoozeAlertActionBodySchema>;
export declare const createActivateAlertActionBodySchema: z.ZodObject<{
    reason: z.ZodString;
}, z.core.$strict>;
export type CreateActivateAlertActionBody = z.infer<typeof createActivateAlertActionBodySchema>;
export declare const createDeactivateAlertActionBodySchema: z.ZodObject<{
    reason: z.ZodString;
}, z.core.$strict>;
export type CreateDeactivateAlertActionBody = z.infer<typeof createDeactivateAlertActionBodySchema>;
export declare const createAlertActionBodySchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.ACK>;
    episode_id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.UNACK>;
    episode_id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.ASSIGN>;
    episode_id: z.ZodString;
    assignee_uid: z.ZodNullable<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.TAG>;
    tags: z.ZodArray<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.SNOOZE>;
    expiry: z.ZodOptional<z.ZodISODateTime>;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.UNSNOOZE>;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.ACTIVATE>;
    reason: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.DEACTIVATE>;
    reason: z.ZodString;
}, z.core.$strip>], "action_type">;
export type CreateAlertActionBody = z.infer<typeof createAlertActionBodySchema>;
export declare const createAlertActionParamsSchema: z.ZodObject<{
    group_hash: z.ZodString;
}, z.core.$strip>;
export type CreateAlertActionParams = z.infer<typeof createAlertActionParamsSchema>;
export declare const bulkCreateAlertActionItemBodySchema: z.ZodIntersection<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.ACK>;
    episode_id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.UNACK>;
    episode_id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.ASSIGN>;
    episode_id: z.ZodString;
    assignee_uid: z.ZodNullable<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.TAG>;
    tags: z.ZodArray<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.SNOOZE>;
    expiry: z.ZodOptional<z.ZodISODateTime>;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.UNSNOOZE>;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.ACTIVATE>;
    reason: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.DEACTIVATE>;
    reason: z.ZodString;
}, z.core.$strip>], "action_type">, z.ZodObject<{
    group_hash: z.ZodString;
}, z.core.$strip>>;
export type BulkCreateAlertActionItemBody = z.infer<typeof bulkCreateAlertActionItemBodySchema>;
export declare const bulkCreateAlertActionBodySchema: z.ZodArray<z.ZodIntersection<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.ACK>;
    episode_id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.UNACK>;
    episode_id: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.ASSIGN>;
    episode_id: z.ZodString;
    assignee_uid: z.ZodNullable<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.TAG>;
    tags: z.ZodArray<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.SNOOZE>;
    expiry: z.ZodOptional<z.ZodISODateTime>;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.UNSNOOZE>;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.ACTIVATE>;
    reason: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action_type: z.ZodLiteral<ALERT_EPISODE_ACTION_TYPE.DEACTIVATE>;
    reason: z.ZodString;
}, z.core.$strip>], "action_type">, z.ZodObject<{
    group_hash: z.ZodString;
}, z.core.$strip>>>;
export type BulkCreateAlertActionBody = z.infer<typeof bulkCreateAlertActionBodySchema>;
