import type { z } from '@kbn/zod/v4';
import type { agentConfigurationIntakeSchema } from './runtime_types/agent_configuration_intake_rt';
export type AgentConfigurationIntake = z.infer<typeof agentConfigurationIntakeSchema>;
export type AgentConfiguration = {
    '@timestamp': number;
    applied_by_agent?: boolean;
    etag: string;
    agent_name?: string;
    error?: string;
} & AgentConfigurationIntake;
