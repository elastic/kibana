import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
export declare const EPISODE_SNOOZED_TRIGGER_ID: "alerting.episodeSnoozed";
export declare const episodeSnoozedPayloadSchema: z.ZodObject<{
    occurredAt: z.ZodISODateTime;
    groupHash: z.ZodString;
    episodeId: z.ZodString;
    ruleId: z.ZodNullable<z.ZodString>;
    spaceId: z.ZodString;
    actorUid: z.ZodNullable<z.ZodString>;
    expiry: z.ZodNullable<z.ZodISODateTime>;
}, z.core.$strict>;
export type EpisodeSnoozedPayload = z.infer<typeof episodeSnoozedPayloadSchema>;
export declare const episodeSnoozedTriggerCommonDefinition: CommonTriggerDefinition<typeof episodeSnoozedPayloadSchema>;
