import type { RulesClientContext } from '../../../../rules_client/types';
import type { RawRuleSnoozedInstance } from '../../../../saved_objects/schemas/raw_rule';
import type { FindMutedAlertsParams } from './types';
export interface FindMutedAlertsResult {
    page: number;
    perPage: number;
    total: number;
    data: Array<{
        id: string;
        mutedInstanceIds: string[];
        snoozedInstances: RawRuleSnoozedInstance[];
    }>;
}
export declare function findMutedAlerts(context: RulesClientContext, params?: FindMutedAlertsParams): Promise<FindMutedAlertsResult>;
