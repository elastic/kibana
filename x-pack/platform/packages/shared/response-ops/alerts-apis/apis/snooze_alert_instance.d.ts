import type { HttpStart } from '@kbn/core-http-browser';
import type { SnoozeCondition } from '../types';
export interface SnoozeAlertInstanceParams {
    id: string;
    instanceId: string;
    http: HttpStart;
    /**
     * ISO date string for when the snooze expires. Omit when using conditions-only snooze.
     */
    expiresAt?: string;
    conditions?: SnoozeCondition[];
    conditionOperator?: 'any' | 'all';
}
export declare const snoozeAlertInstance: ({ id, instanceId, http, expiresAt, conditions, conditionOperator, }: SnoozeAlertInstanceParams) => Promise<void>;
