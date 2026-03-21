import { z } from '@kbn/zod/v4';
export type AttackDiscoveryMissingPrivileges = z.infer<typeof AttackDiscoveryMissingPrivileges>;
export declare const AttackDiscoveryMissingPrivileges: z.ZodObject<{
    index_name: z.ZodString;
    privileges: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
/**
 * The missing index privileges required for Attack discovery
 */
export type GetAttackDiscoveryMissingPrivilegesInternalResponse = z.infer<typeof GetAttackDiscoveryMissingPrivilegesInternalResponse>;
export declare const GetAttackDiscoveryMissingPrivilegesInternalResponse: z.ZodArray<z.ZodObject<{
    index_name: z.ZodString;
    privileges: z.ZodArray<z.ZodString>;
}, z.core.$strip>>;
