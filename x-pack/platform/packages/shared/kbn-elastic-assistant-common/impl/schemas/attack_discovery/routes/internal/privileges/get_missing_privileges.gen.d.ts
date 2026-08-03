import { z } from '@kbn/zod/v4';
export declare const AttackDiscoveryMissingPrivileges: z.ZodObject<{
    index_name: z.ZodString;
    privileges: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type AttackDiscoveryMissingPrivileges = z.infer<typeof AttackDiscoveryMissingPrivileges>;
export declare const AttackDiscoveryMissingFeaturePrivileges: z.ZodObject<{
    feature_id: z.ZodString;
    privileges: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type AttackDiscoveryMissingFeaturePrivileges = z.infer<typeof AttackDiscoveryMissingFeaturePrivileges>;
/**
 * The missing privileges required for Attack discovery
 */
export declare const GetAttackDiscoveryMissingPrivilegesInternalResponse: z.ZodObject<{
    index_privileges: z.ZodArray<z.ZodObject<{
        index_name: z.ZodString;
        privileges: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
    feature_privileges: z.ZodArray<z.ZodObject<{
        feature_id: z.ZodString;
        privileges: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type GetAttackDiscoveryMissingPrivilegesInternalResponse = z.infer<typeof GetAttackDiscoveryMissingPrivilegesInternalResponse>;
