import type { Alert } from '@kbn/alerting-types';
import type { SnoozedInstance } from '@kbn/response-ops-alerts-apis/types';
export declare const useAlertSnoozedState: (alert?: Alert) => {
    isSnoozed: boolean;
    expiresAt: string | undefined;
    snoozedInstance: SnoozedInstance | undefined;
    ruleId: string | undefined;
    alertInstanceId: string | undefined;
};
