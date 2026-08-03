import type { RuleType } from '@kbn/triggers-actions-ui-types';
import type { HttpStart } from '@kbn/core-http-browser';
import type { RuleTypeSolution } from '@kbn/alerting-types';
export interface InternalRuleType extends RuleType<string, string> {
    solution: RuleTypeSolution;
}
export interface GetInternalRuleTypesParams {
    http: HttpStart;
    /**
     * When `true`, the response also includes rule types the user can read as
     * alerts (not only as rules). Alert views opt in so alerts-only users still
     * receive a non-empty list.
     */
    includeAlertViewableTypes?: boolean;
}
export declare function getInternalRuleTypes({ http, includeAlertViewableTypes, }: GetInternalRuleTypesParams): Promise<InternalRuleType[]>;
