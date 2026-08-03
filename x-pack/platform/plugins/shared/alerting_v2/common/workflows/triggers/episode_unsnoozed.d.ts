import type { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
export declare const EPISODE_UNSNOOZED_TRIGGER_ID: "alerting.episodeUnsnoozed";
export declare const episodeUnsnoozedPayloadSchema: z.ZodObject<{
    occurredAt: z.ZodISODateTime;
    groupHash: z.ZodString;
    episodeId: z.ZodString;
    ruleId: z.ZodNullable<z.ZodString>;
    spaceId: z.ZodString;
    actorUid: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export type EpisodeUnsnoozedPayload = z.infer<typeof episodeUnsnoozedPayloadSchema>;
export declare const episodeUnsnoozedTriggerCommonDefinition: CommonTriggerDefinition<typeof episodeUnsnoozedPayloadSchema>;
