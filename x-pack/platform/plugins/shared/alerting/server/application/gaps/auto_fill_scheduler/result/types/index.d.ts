import type { TypeOf } from '@kbn/config-schema';
import type { gapAutoFillSchedulerSchema } from '../schemas';
export type GapAutoFillScheduler = TypeOf<typeof gapAutoFillSchedulerSchema>;
export interface GapAutoFillSchedulerResponse {
    id: string;
    name: string;
    enabled: boolean;
    schedule: {
        interval: string;
    };
    gapFillRange: string;
    ruleTypes: Array<{
        type: string;
        consumer: string;
    }>;
    scope: string[];
    maxBackfills: number;
    numRetries: number;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
}
