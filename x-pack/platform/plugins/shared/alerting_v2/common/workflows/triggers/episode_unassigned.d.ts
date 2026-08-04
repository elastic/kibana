import type { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
export declare const EPISODE_UNASSIGNED_TRIGGER_ID: "alerting.episodeUnassigned";
export declare const episodeUnassignedPayloadSchema: z.ZodObject<{
    occurredAt: z.ZodISODateTime;
    groupHash: z.ZodString;
    episodeId: z.ZodString;
    ruleId: z.ZodNullable<z.ZodString>;
    spaceId: z.ZodString;
    actorUid: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export type EpisodeUnassignedPayload = z.infer<typeof episodeUnassignedPayloadSchema>;
export declare const episodeUnassignedTriggerCommonDefinition: CommonTriggerDefinition<typeof episodeUnassignedPayloadSchema>;
