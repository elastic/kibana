interface ConnectorFeatureConfig {
    /**
     * Unique identifier for this feature.
     */
    id: string;
    /**
     * Display name for this feature.
     * This will be displayed to end-users, so a translatable string is advised for i18n.
     */
    name: string;
    compatibility: string;
}
export declare const AlertingConnectorFeatureId = "alerting";
export declare const CasesConnectorFeatureId = "cases";
export declare const UptimeConnectorFeatureId = "uptime";
export declare const SecurityConnectorFeatureId = "siem";
export declare const GenerativeAIForSecurityConnectorFeatureId = "generativeAIForSecurity";
export declare const GenerativeAIForObservabilityConnectorFeatureId = "generativeAIForObservability";
export declare const GenerativeAIForSearchPlaygroundConnectorFeatureId = "generativeAIForSearchPlayground";
export declare const EndpointSecurityConnectorFeatureId = "endpointSecurity";
export declare const WorkflowsConnectorFeatureId = "workflows";
export declare const AgentBuilderConnectorFeatureId = "agentBuilder";
export declare const AlertingConnectorFeature: ConnectorFeatureConfig;
export declare const CasesConnectorFeature: ConnectorFeatureConfig;
export declare const UptimeConnectorFeature: ConnectorFeatureConfig;
export declare const SecuritySolutionFeature: ConnectorFeatureConfig;
export declare const GenerativeAIForSecurityFeature: ConnectorFeatureConfig;
export declare const GenerativeAIForObservabilityFeature: ConnectorFeatureConfig;
export declare const GenerativeAIForSearchPlaygroundFeature: ConnectorFeatureConfig;
export declare const EndpointSecurityConnectorFeature: ConnectorFeatureConfig;
export declare const WorkflowsConnectorFeature: ConnectorFeatureConfig;
export declare const AgentBuilderConnectorFeature: ConnectorFeatureConfig;
export declare function areValidFeatures(ids: string[]): boolean;
export declare function getConnectorFeatureName(id: string): string;
export declare function getConnectorCompatibility(featureIds?: string[]): string[];
export {};
