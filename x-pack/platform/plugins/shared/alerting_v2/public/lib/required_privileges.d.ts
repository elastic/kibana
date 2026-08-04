import { type AlertingV2Feature } from '../../common/feature_privileges';
type AlertingCapability = 'read' | 'all';
/**
 * Describes a single privilege a user must hold to view a gated page, surfaced
 * in the "Privileges required" interstitial so the user can tell their admin
 * exactly what to grant. Deliberately omits the underlying UI capability id,
 * which is an implementation detail users do not recognise.
 */
export interface AlertingRequiredPrivilege {
    /** Kibana feature id backing the capability, e.g. "alerting_v2_rules". */
    featureId: string;
    /** Feature name as it appears in role management, e.g. "Rules". */
    featureName: string;
    /** Minimum feature privilege that grants access, e.g. "read". */
    privilege: AlertingCapability;
}
/**
 * Builds the list of privileges required to view a page from its feature set.
 * The `read` capability is minimally granted by the feature's `read` privilege
 * (and also by `all`), so the privilege level mirrors the requested capability.
 */
export declare const getAlertingRequiredPrivileges: (features: readonly AlertingV2Feature[], capability?: AlertingCapability) => AlertingRequiredPrivilege[];
export {};
