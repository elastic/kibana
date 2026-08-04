import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
export declare const EPISODE_ACTIVATED_TRIGGER_ID: "alerting.episodeActivated";
export declare const episodeActivatedPayloadSchema: z.ZodObject<{
    occurredAt: z.ZodISODateTime;
    groupHash: z.ZodString;
    episodeId: z.ZodString;
    ruleId: z.ZodNullable<z.ZodString>;
    spaceId: z.ZodString;
    actorUid: z.ZodNullable<z.ZodString>;
    reason: z.ZodString;
}, z.core.$strict>;
export type EpisodeActivatedPayload = z.infer<typeof episodeActivatedPayloadSchema>;
export declare const episodeActivatedTriggerCommonDefinition: CommonTriggerDefinition<typeof episodeActivatedPayloadSchema>;
