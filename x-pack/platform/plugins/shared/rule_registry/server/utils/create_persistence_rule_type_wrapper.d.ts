import type { estypes } from '@elastic/elasticsearch';
import { ALERT_INSTANCE_ID, ALERT_SUPPRESSION_DOCS_COUNT, ALERT_SUPPRESSION_END, ALERT_SUPPRESSION_START } from '@kbn/rule-data-utils';
import type { CreatePersistenceRuleTypeWrapper } from './persistence_types';
import type { CommonAlertFields870, SuppressionFields870 } from '../../common/schemas';
/**
 * Alerts returned from BE have date type coerced to ISO strings
 *
 * We use BackendAlertWithSuppressionFields870 explicitly here as the type instead of
 * AlertWithSuppressionFieldsLatest since we're reading alerts rather than writing,
 * so future versions of Kibana may read 8.7.0 version alerts and need to update them
 */
export type BackendAlertWithSuppressionFields870 = Omit<SuppressionFields870, typeof ALERT_SUPPRESSION_START | typeof ALERT_SUPPRESSION_END> & {
    [ALERT_SUPPRESSION_START]: string;
    [ALERT_SUPPRESSION_END]: string;
} & CommonAlertFields870;
export declare const ALERT_GROUP_INDEX: "kibana.alert.group.index";
/**
 * suppress alerts by ALERT_INSTANCE_ID in memory
 */
export declare const suppressAlertsInMemory: <T extends {
    _id: string;
    _source: {
        [ALERT_SUPPRESSION_DOCS_COUNT]: number;
        [ALERT_INSTANCE_ID]: string;
        [ALERT_SUPPRESSION_START]: Date;
        [ALERT_SUPPRESSION_END]: Date;
    };
}>(alerts: T[]) => {
    alertCandidates: T[];
    suppressedAlerts: T[];
};
/**
 * Compare existing alert suppression date props with alert to suppressed alert values
 **/
export declare const isExistingDateGtEqThanAlert: <T extends {
    [ALERT_SUPPRESSION_END]: Date;
    [ALERT_SUPPRESSION_START]: Date;
}>(existingAlert: estypes.SearchHit<BackendAlertWithSuppressionFields870>, alert: {
    _id: string;
    _source: T;
}, property: typeof ALERT_SUPPRESSION_END | typeof ALERT_SUPPRESSION_START) => boolean;
interface SuppressionBoundaries {
    [ALERT_SUPPRESSION_END]: Date;
    [ALERT_SUPPRESSION_START]: Date;
}
/**
 * returns updated suppression time boundaries
 */
export declare const getUpdatedSuppressionBoundaries: <T extends SuppressionBoundaries>(existingAlert: estypes.SearchHit<BackendAlertWithSuppressionFields870>, alert: {
    _id: string;
    _source: T;
}, executionId: string) => Partial<SuppressionBoundaries>;
export declare const createPersistenceRuleTypeWrapper: CreatePersistenceRuleTypeWrapper;
export {};
