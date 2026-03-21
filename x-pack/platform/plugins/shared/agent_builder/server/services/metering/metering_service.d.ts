import type { Logger } from '@kbn/logging';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { UsageApiSetup } from '@kbn/usage-api-plugin/server';
import type { AgentExecutionUsage } from './types';
export declare const createMeteringService: ({ logger, cloud, usageApi, }: {
    logger: Logger;
    cloud: CloudSetup | undefined;
    usageApi: UsageApiSetup | undefined;
}) => MeteringService;
export interface MeteringService {
    reportExecution(execution: AgentExecutionUsage): Promise<void>;
}
