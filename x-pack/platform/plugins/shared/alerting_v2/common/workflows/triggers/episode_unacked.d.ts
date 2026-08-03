import type { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
export declare const EPISODE_UNACKED_TRIGGER_ID: "alerting.episodeUnacked";
export declare const episodeUnackedPayloadSchema: z.ZodObject<{
    occurredAt: z.ZodISODateTime;
    groupHash: z.ZodString;
    episodeId: z.ZodString;
    ruleId: z.ZodNullable<z.ZodString>;
    spaceId: z.ZodString;
    actorUid: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export type EpisodeUnackedPayload = z.infer<typeof episodeUnackedPayloadSchema>;
export declare const episodeUnackedTriggerCommonDefinition: CommonTriggerDefinition<typeof episodeUnackedPayloadSchema>;
