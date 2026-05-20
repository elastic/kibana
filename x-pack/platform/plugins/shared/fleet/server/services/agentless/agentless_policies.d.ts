import { type ElasticsearchClient, type KibanaRequest, type Logger, type RequestHandlerContext, type SavedObjectsClientContract } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { CreateAgentlessPolicyRequestSchema } from '../../../common/types';
import type { PackagePolicyClient } from '../package_policy_service';
export interface AgentlessPoliciesService {
    createAgentlessPolicy: (data: TypeOf<typeof CreateAgentlessPolicyRequestSchema.body>, context?: RequestHandlerContext, request?: KibanaRequest) => Promise<any>;
    deleteAgentlessPolicy: (policyId: string, options?: {
        force?: boolean;
    }, context?: RequestHandlerContext, request?: KibanaRequest) => Promise<void>;
}
export declare class AgentlessPoliciesServiceImpl implements AgentlessPoliciesService {
    private readonly packagePolicyService;
    private readonly soClient;
    private readonly esClient;
    private readonly logger;
    constructor(packagePolicyService: PackagePolicyClient, soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, logger: Logger);
    createAgentlessPolicy(data: TypeOf<typeof CreateAgentlessPolicyRequestSchema.body>, context?: RequestHandlerContext, request?: KibanaRequest): Promise<import("../../types").PackagePolicy>;
    deleteAgentlessPolicy(policyId: string, options?: {
        force?: boolean;
    }, context?: RequestHandlerContext, request?: KibanaRequest): Promise<void>;
}
