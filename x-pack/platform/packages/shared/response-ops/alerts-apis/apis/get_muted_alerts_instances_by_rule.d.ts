import type { HttpStart } from '@kbn/core-http-browser';
import type { SnoozedInstance, SnoozeCondition } from '../types';
interface SnoozedAlertInstanceApiResponse {
    instance_id: string;
    expires_at?: string;
    conditions?: SnoozeCondition[];
    condition_operator?: 'any' | 'all';
    snoozed_at: string;
    snoozed_by: string;
}
export interface MutedAlertRecord {
    id: string;
    muted_alert_instance_ids: string[];
    snoozed_alert_instances?: SnoozedAlertInstanceApiResponse[];
}
export interface FindMutedAlertsResponse {
    data: MutedAlertRecord[];
}
export interface GetAlertSnoozeStateByRuleParams {
    ruleIds: string[];
    http: HttpStart;
    signal?: AbortSignal;
}
export declare const getAlertSnoozeStateByRule: ({ http, ruleIds, signal, }: GetAlertSnoozeStateByRuleParams) => Promise<{
    data: {
        id: string;
        mutedAlertIds: string[];
        snoozedInstances: SnoozedInstance[];
    }[];
}>;
/**
 * @deprecated Use {@link getAlertSnoozeStateByRule} instead.
 */
export declare const getMutedAlertsInstancesByRule: ({ http, ruleIds, signal, }: GetAlertSnoozeStateByRuleParams) => Promise<{
    data: {
        id: string;
        mutedAlertIds: string[];
        snoozedInstances: SnoozedInstance[];
    }[];
}>;
export {};
