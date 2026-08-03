import { z } from '@kbn/zod/v4';
export declare const episodeActionEnvelopeSchema: z.ZodObject<{
    occurredAt: z.ZodISODateTime;
    groupHash: z.ZodString;
    episodeId: z.ZodString;
    ruleId: z.ZodNullable<z.ZodString>;
    spaceId: z.ZodString;
    actorUid: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export type EpisodeActionEnvelopePayload = z.infer<typeof episodeActionEnvelopeSchema>;
