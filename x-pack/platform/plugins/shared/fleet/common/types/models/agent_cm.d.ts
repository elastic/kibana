import type { FullAgentPolicy } from './agent_policy';
export interface FullAgentConfigMap {
    apiVersion: string;
    kind: string;
    metadata: Metadata;
    data: AgentYML;
}
interface Metadata {
    name: string;
    namespace: string;
    labels: Labels;
}
interface Labels {
    'k8s-app': string;
}
interface AgentYML {
    'agent.yml': FullAgentPolicy;
}
export {};
