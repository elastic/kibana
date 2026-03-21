export interface GapAutoFillSchedulerSO {
    id: string;
    name: string;
    enabled: boolean;
    schedule: {
        interval: string;
    };
    gapFillRange: string;
    maxBackfills: number;
    numRetries: number;
    scope: string[];
    ruleTypes: Array<{
        type: string;
        consumer: string;
    }>;
    ruleTypeConsumerPairs: string[];
    createdBy?: string | null;
    updatedBy?: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface GapAutoFillScheduler {
    id: string;
    name: string;
    enabled: boolean;
    schedule: {
        interval: string;
    };
    gapFillRange: string;
    maxBackfills: number;
    numRetries: number;
    scope: string[];
    ruleTypes: Array<{
        type: string;
        consumer: string;
    }>;
    createdBy?: string | null;
    updatedBy?: string | null;
    createdAt: string;
    updatedAt: string;
}
