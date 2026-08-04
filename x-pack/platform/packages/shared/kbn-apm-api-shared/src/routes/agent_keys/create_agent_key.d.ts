import { z } from '@kbn/zod/v4';
import type { SecurityCreateApiKeyResponse } from '@elastic/elasticsearch/lib/api/types';
export interface CreateAgentKeyResponse {
    agentKey: SecurityCreateApiKeyResponse;
}
export declare const createAgentKeyRoute: {
    endpoint: "POST /api/apm/agent_keys 2023-10-31";
    params?: z.ZodObject<{
        body: z.ZodObject<{
            name: z.ZodString;
            privileges: z.ZodArray<z.ZodUnion<readonly [z.ZodLiteral<import("@kbn/apm-types").PrivilegeType.EVENT>, z.ZodLiteral<import("@kbn/apm-types").PrivilegeType.AGENT_CONFIG>]>>;
        }, z.core.$strip>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<CreateAgentKeyResponse>;
