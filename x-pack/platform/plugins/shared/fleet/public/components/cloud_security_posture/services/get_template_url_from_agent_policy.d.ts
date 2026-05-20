import type { AgentPolicy } from '../../../types';
export declare const SUPPORTED_TEMPLATES_URL_FROM_AGENT_POLICY_CONFIG: {
    CLOUD_FORMATION: string;
    ARM_TEMPLATE: string;
};
export declare const getTemplateUrlFromAgentPolicy: (templateUrlFieldName: string, selectedPolicy?: AgentPolicy) => string | undefined;
