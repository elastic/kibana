import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
export declare const EPISODE_ASSIGNED_TRIGGER_ID: "alerting.episodeAssigned";
export declare const episodeAssignedPayloadSchema: z.ZodObject<{
    occurredAt: z.ZodISODateTime;
    groupHash: z.ZodString;
    episodeId: z.ZodString;
    ruleId: z.ZodNullable<z.ZodString>;
    spaceId: z.ZodString;
    actorUid: z.ZodNullable<z.ZodString>;
    assigneeUid: z.ZodString;
}, z.core.$strict>;
export type EpisodeAssignedPayload = z.infer<typeof episodeAssignedPayloadSchema>;
export declare const episodeAssignedTriggerCommonDefinition: CommonTriggerDefinition<typeof episodeAssignedPayloadSchema>;
