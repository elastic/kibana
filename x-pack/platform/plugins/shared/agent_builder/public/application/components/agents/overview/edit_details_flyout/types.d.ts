import type { AgentVisibility } from '@kbn/agent-builder-common';
export interface EditDetailsFormData {
    name: string;
    description: string;
    avatar_symbol: string;
    avatar_color: string;
    labels: string[];
    visibility: AgentVisibility;
    configuration: {
        enable_elastic_capabilities: boolean;
        workflow_ids: string[];
        instructions: string;
    };
}
