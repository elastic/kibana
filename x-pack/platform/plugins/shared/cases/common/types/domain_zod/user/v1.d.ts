import { z } from '@kbn/zod/v4';
export declare const UserSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    profile_uid: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const UserWithProfileInfoSchema: z.ZodObject<{
    user: z.ZodObject<{
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
    uid: z.ZodOptional<z.ZodString>;
    avatar: z.ZodOptional<z.ZodObject<{
        initials: z.ZodNullable<z.ZodString>;
        color: z.ZodNullable<z.ZodString>;
        imageUrl: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const UsersSchema: z.ZodArray<z.ZodObject<{
    email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    profile_uid: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>;
export type User = z.infer<typeof UserSchema>;
export type UserWithProfileInfo = z.infer<typeof UserWithProfileInfoSchema>;
export declare const CaseUserProfileSchema: z.ZodObject<{
    uid: z.ZodString;
}, z.core.$strip>;
export type CaseUserProfile = z.infer<typeof CaseUserProfileSchema>;
/**
 * UID-only assignees for caller-supplied input (templates, imports). Identity
 * fields are server-derived, so they must not be expressible on the input side.
 */
export declare const CaseUserProfilesSchema: z.ZodArray<z.ZodObject<{
    uid: z.ZodString;
}, z.core.$strip>>;
export type CaseUserProfiles = z.infer<typeof CaseUserProfilesSchema>;
export declare const CaseAssigneeSchema: z.ZodObject<{
    uid: z.ZodString;
    username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type CaseAssignee = z.infer<typeof CaseAssigneeSchema>;
/**
 * Assignees
 */
export declare const CaseAssigneesSchema: z.ZodArray<z.ZodObject<{
    uid: z.ZodString;
    username: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    full_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>>;
export type CaseAssignees = z.infer<typeof CaseAssigneesSchema>;
