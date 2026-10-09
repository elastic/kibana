import { z } from '@kbn/zod/v4';
export declare const alertEpisodeStatusSchema: z.ZodUnion<readonly [z.ZodLiteral<"inactive">, z.ZodLiteral<"pending">, z.ZodLiteral<"active">, z.ZodLiteral<"recovering">]>;
/**
 * Canonical AlertEpisode row shape (dotted ES|QL keys).
 * Nullable fields match what query / client normalization may return.
 */
export declare const alertEpisodeSchema: z.ZodObject<{
    '@timestamp': z.ZodISODateTime;
    'episode.id': z.ZodString;
    'episode.status': z.ZodUnion<readonly [z.ZodLiteral<"inactive">, z.ZodLiteral<"pending">, z.ZodLiteral<"active">, z.ZodLiteral<"recovering">]>;
    'rule.id': z.ZodString;
    group_hash: z.ZodString;
    first_timestamp: z.ZodISODateTime;
    last_timestamp: z.ZodISODateTime;
    duration: z.ZodNumber;
    duration_is_lower_bound: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    triggered_at: z.ZodOptional<z.ZodNullable<z.ZodISODateTime>>;
    last_ack_action: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        ack: "ack";
        unack: "unack";
    }>>>;
    last_assignee_uid: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    last_snooze_action: z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        snooze: "snooze";
        unsnooze: "unsnooze";
    }>>>;
    snoozed_until: z.ZodOptional<z.ZodNullable<z.ZodISODateTime>>;
    last_tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    episode_data: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    severity: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strict>;
export type AlertEpisode = z.infer<typeof alertEpisodeSchema>;
