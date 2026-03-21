import { z } from '@kbn/zod/v4';
/**
 * A Defend insight event
 */
export type DefendInsightEvent = z.infer<typeof DefendInsightEvent>;
export declare const DefendInsightEvent: z.ZodObject<{
    id: z.ZodString;
    endpointId: z.ZodString;
    value: z.ZodString;
}, z.core.$strip>;
/**
 * The insight type (ie. incompatible_antivirus)
 */
export type DefendInsightType = z.infer<typeof DefendInsightType>;
export declare const DefendInsightType: z.ZodEnum<{
    custom: "custom";
    incompatible_antivirus: "incompatible_antivirus";
    policy_response_failure: "policy_response_failure";
}>;
export type DefendInsightTypeEnum = typeof DefendInsightType.enum;
export declare const DefendInsightTypeEnum: {
    custom: "custom";
    incompatible_antivirus: "incompatible_antivirus";
    policy_response_failure: "policy_response_failure";
};
/**
 * A Defend insight generated from endpoint events
 */
export type DefendInsight = z.infer<typeof DefendInsight>;
export declare const DefendInsight: z.ZodObject<{
    group: z.ZodString;
    events: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        endpointId: z.ZodString;
        value: z.ZodString;
    }, z.core.$strip>>>;
    remediation: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
}, z.core.$strip>;
/**
 * Array of Defend insights
 */
export type DefendInsights = z.infer<typeof DefendInsights>;
export declare const DefendInsights: z.ZodArray<z.ZodObject<{
    group: z.ZodString;
    events: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        endpointId: z.ZodString;
        value: z.ZodString;
    }, z.core.$strip>>>;
    remediation: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
}, z.core.$strip>>;
/**
 * The status of the Defend insight.
 */
export type DefendInsightStatus = z.infer<typeof DefendInsightStatus>;
export declare const DefendInsightStatus: z.ZodEnum<{
    failed: "failed";
    running: "running";
    canceled: "canceled";
    succeeded: "succeeded";
}>;
export type DefendInsightStatusEnum = typeof DefendInsightStatus.enum;
export declare const DefendInsightStatusEnum: {
    failed: "failed";
    running: "running";
    canceled: "canceled";
    succeeded: "succeeded";
};
/**
 * Run durations for the Defend insight
 */
export type DefendInsightGenerationInterval = z.infer<typeof DefendInsightGenerationInterval>;
export declare const DefendInsightGenerationInterval: z.ZodObject<{
    date: z.ZodString;
    durationMs: z.ZodNumber;
}, z.core.$strip>;
export type DefendInsightsResponse = z.infer<typeof DefendInsightsResponse>;
export declare const DefendInsightsResponse: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodString;
    lastViewedAt: z.ZodString;
    eventsContextCount: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodString;
    replacements: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodString>>>;
    users: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    status: z.ZodEnum<{
        failed: "failed";
        running: "running";
        canceled: "canceled";
        succeeded: "succeeded";
    }>;
    endpointIds: z.ZodArray<z.ZodString>;
    insightType: z.ZodEnum<{
        custom: "custom";
        incompatible_antivirus: "incompatible_antivirus";
        policy_response_failure: "policy_response_failure";
    }>;
    insights: z.ZodArray<z.ZodObject<{
        group: z.ZodString;
        events: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            endpointId: z.ZodString;
            value: z.ZodString;
        }, z.core.$strip>>>;
        remediation: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    }, z.core.$strip>>;
    apiConfig: z.ZodObject<{
        connectorId: z.ZodString;
        actionTypeId: z.ZodString;
        defaultSystemPromptId: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodEnum<{
            Other: "Other";
            "Azure OpenAI": "Azure OpenAI";
            OpenAI: "OpenAI";
        }>>;
        model: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    namespace: z.ZodString;
    backingIndex: z.ZodString;
    generationIntervals: z.ZodArray<z.ZodObject<{
        date: z.ZodString;
        durationMs: z.ZodNumber;
    }, z.core.$strip>>;
    averageIntervalMs: z.ZodNumber;
    failureReason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type DefendInsightUpdateProps = z.infer<typeof DefendInsightUpdateProps>;
export declare const DefendInsightUpdateProps: z.ZodObject<{
    id: z.ZodString;
    apiConfig: z.ZodOptional<z.ZodObject<{
        connectorId: z.ZodString;
        actionTypeId: z.ZodString;
        defaultSystemPromptId: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodEnum<{
            Other: "Other";
            "Azure OpenAI": "Azure OpenAI";
            OpenAI: "OpenAI";
        }>>;
        model: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    eventsContextCount: z.ZodOptional<z.ZodNumber>;
    insights: z.ZodOptional<z.ZodArray<z.ZodObject<{
        group: z.ZodString;
        events: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            endpointId: z.ZodString;
            value: z.ZodString;
        }, z.core.$strip>>>;
        remediation: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    }, z.core.$strip>>>;
    status: z.ZodOptional<z.ZodEnum<{
        failed: "failed";
        running: "running";
        canceled: "canceled";
        succeeded: "succeeded";
    }>>;
    replacements: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodString>>>;
    generationIntervals: z.ZodOptional<z.ZodArray<z.ZodObject<{
        date: z.ZodString;
        durationMs: z.ZodNumber;
    }, z.core.$strip>>>;
    backingIndex: z.ZodString;
    failureReason: z.ZodOptional<z.ZodString>;
    lastViewedAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type DefendInsightsUpdateProps = z.infer<typeof DefendInsightsUpdateProps>;
export declare const DefendInsightsUpdateProps: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    apiConfig: z.ZodOptional<z.ZodObject<{
        connectorId: z.ZodString;
        actionTypeId: z.ZodString;
        defaultSystemPromptId: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodEnum<{
            Other: "Other";
            "Azure OpenAI": "Azure OpenAI";
            OpenAI: "OpenAI";
        }>>;
        model: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    eventsContextCount: z.ZodOptional<z.ZodNumber>;
    insights: z.ZodOptional<z.ZodArray<z.ZodObject<{
        group: z.ZodString;
        events: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            endpointId: z.ZodString;
            value: z.ZodString;
        }, z.core.$strip>>>;
        remediation: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    }, z.core.$strip>>>;
    status: z.ZodOptional<z.ZodEnum<{
        failed: "failed";
        running: "running";
        canceled: "canceled";
        succeeded: "succeeded";
    }>>;
    replacements: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodString>>>;
    generationIntervals: z.ZodOptional<z.ZodArray<z.ZodObject<{
        date: z.ZodString;
        durationMs: z.ZodNumber;
    }, z.core.$strip>>>;
    backingIndex: z.ZodString;
    failureReason: z.ZodOptional<z.ZodString>;
    lastViewedAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>;
export type DefendInsightCreateProps = z.infer<typeof DefendInsightCreateProps>;
export declare const DefendInsightCreateProps: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<{
        failed: "failed";
        running: "running";
        canceled: "canceled";
        succeeded: "succeeded";
    }>;
    eventsContextCount: z.ZodOptional<z.ZodNumber>;
    endpointIds: z.ZodArray<z.ZodString>;
    insightType: z.ZodEnum<{
        custom: "custom";
        incompatible_antivirus: "incompatible_antivirus";
        policy_response_failure: "policy_response_failure";
    }>;
    insights: z.ZodArray<z.ZodObject<{
        group: z.ZodString;
        events: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            endpointId: z.ZodString;
            value: z.ZodString;
        }, z.core.$strip>>>;
        remediation: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
    }, z.core.$strip>>;
    apiConfig: z.ZodObject<{
        connectorId: z.ZodString;
        actionTypeId: z.ZodString;
        defaultSystemPromptId: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodEnum<{
            Other: "Other";
            "Azure OpenAI": "Azure OpenAI";
            OpenAI: "OpenAI";
        }>>;
        model: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    replacements: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodString>>>;
}, z.core.$strip>;
