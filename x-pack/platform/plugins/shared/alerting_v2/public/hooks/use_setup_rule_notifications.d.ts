import { type ActionDraft } from '@kbn/alerting-v2-rule-form';
import type { RuleApiResponse } from '../services/rules_api';
export interface SetupRuleNotificationsParams {
    rule: RuleApiResponse;
    actions: ActionDraft[];
}
export declare const useSetupRuleNotifications: () => import("@tanstack/react-query").UseMutationResult<void, unknown, SetupRuleNotificationsParams, unknown>;
