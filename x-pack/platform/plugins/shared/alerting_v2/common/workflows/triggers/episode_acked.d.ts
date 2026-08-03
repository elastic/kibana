import type { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
export declare const EPISODE_ACKED_TRIGGER_ID: "alerting.episodeAcked";
export declare const episodeAckedPayloadSchema: z.ZodObject<{
    occurredAt: z.ZodISODateTime;
    groupHash: z.ZodString;
    episodeId: z.ZodString;
    ruleId: z.ZodNullable<z.ZodString>;
    spaceId: z.ZodString;
    actorUid: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export type EpisodeAckedPayload = z.infer<typeof episodeAckedPayloadSchema>;
export declare const episodeAckedTriggerCommonDefinition: CommonTriggerDefinition<typeof episodeAckedPayloadSchema>;
