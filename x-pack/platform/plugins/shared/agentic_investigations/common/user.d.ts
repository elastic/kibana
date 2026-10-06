import { z } from '@kbn/zod/v4';
/**
 * Who acted, shared by every entity this plugin owns.
 *
 * The shape Cases established: the profile uid is the stable identity a UI
 * resolves an avatar from, and the names are stored rather than looked up so
 * attribution survives a missing profile. The uid is genuinely often absent —
 * security disabled, a `run-as` proxy, a session without a profile, or an API
 * key whose creator has no activated profile.
 */
export declare const userSchema: z.ZodObject<{
    username: z.ZodNullable<z.ZodString>;
    fullName: z.ZodNullable<z.ZodString>;
    email: z.ZodNullable<z.ZodString>;
    profileUid: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type User = z.infer<typeof userSchema>;
