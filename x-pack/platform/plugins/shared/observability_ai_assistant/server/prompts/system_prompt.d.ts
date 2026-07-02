export declare function getSystemPrompt({ availableFunctionNames, isServerless, isKnowledgeBaseReady, isObservabilityDeployment, isGenericDeployment, isProductDocAvailable, }: {
    availableFunctionNames: string[];
    isServerless?: boolean;
    isKnowledgeBaseReady: boolean;
    isObservabilityDeployment: boolean;
    isGenericDeployment: boolean;
    isProductDocAvailable?: boolean;
}): string;
