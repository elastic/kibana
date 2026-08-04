export declare enum ElasticLlmCalloutKey {
    TOUR_CALLOUT = "observabilityAIAssistant_elasticLlmTourCalloutDismissed",
    CONVERSATION_CALLOUT = "observabilityAIAssistant_elasticLlmConversationCalloutDismissed"
}
export declare function useElasticLlmCalloutDismissed(storageKey: ElasticLlmCalloutKey, defaultValue?: boolean): [boolean, (isDismissed: boolean) => void];
