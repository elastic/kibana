import type { AgentAccessControl } from '@kbn/agent-builder-common';
export interface EditDetailsFormData {
    name: string;
    description: string;
    avatar_symbol: string;
    avatar_color: string;
    labels: string[];
    access_control: Pick<AgentAccessControl, 'access_mode'>;
    configuration: {
        enable_elastic_capabilities: boolean;
        workflow_ids: string[];
        instructions: string;
    };
}
