import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
export declare const EPISODE_DEACTIVATED_TRIGGER_ID: "alerting.episodeDeactivated";
export declare const episodeDeactivatedPayloadSchema: z.ZodObject<{
    occurredAt: z.ZodISODateTime;
    groupHash: z.ZodString;
    episodeId: z.ZodString;
    ruleId: z.ZodNullable<z.ZodString>;
    spaceId: z.ZodString;
    actorUid: z.ZodNullable<z.ZodString>;
    reason: z.ZodString;
}, z.core.$strict>;
export type EpisodeDeactivatedPayload = z.infer<typeof episodeDeactivatedPayloadSchema>;
export declare const episodeDeactivatedTriggerCommonDefinition: CommonTriggerDefinition<typeof episodeDeactivatedPayloadSchema>;
