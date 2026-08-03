import { z } from '@kbn/zod/v4';
export declare enum PrivilegeType {
    EVENT = "event:write",
    AGENT_CONFIG = "config_agent:read"
}
export declare enum ClusterPrivilegeType {
    MANAGE_OWN_API_KEY = "manage_own_api_key"
}
export declare const privilegesTypeSchema: z.ZodArray<z.ZodUnion<readonly [z.ZodLiteral<PrivilegeType.EVENT>, z.ZodLiteral<PrivilegeType.AGENT_CONFIG>]>>;
