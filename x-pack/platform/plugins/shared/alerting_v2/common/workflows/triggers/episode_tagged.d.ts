import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
export declare const EPISODE_TAGGED_TRIGGER_ID: "alerting.episodeTagged";
export declare const episodeTaggedPayloadSchema: z.ZodObject<{
    occurredAt: z.ZodISODateTime;
    groupHash: z.ZodString;
    episodeId: z.ZodString;
    ruleId: z.ZodNullable<z.ZodString>;
    spaceId: z.ZodString;
    actorUid: z.ZodNullable<z.ZodString>;
    tags: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export type EpisodeTaggedPayload = z.infer<typeof episodeTaggedPayloadSchema>;
export declare const episodeTaggedTriggerCommonDefinition: CommonTriggerDefinition<typeof episodeTaggedPayloadSchema>;
