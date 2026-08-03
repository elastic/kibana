export declare enum AgentExplorerFieldName {
    ServiceName = "serviceName",
    Environments = "environments",
    AgentName = "agentName",
    AgentVersion = "agentVersion",
    AgentLastVersion = "agentLastVersion",
    AgentDocsPageUrl = "agentDocsPageUrl",
    Instances = "instances"
}
export interface ElasticApmAgentLatestVersion {
    latest_version: string;
}
export interface OtelAgentLatestVersion {
    sdk_latest_version: string;
    auto_latest_version?: string;
}
