import React from 'react';
import type { AlertingV2Feature } from '../../common/feature_privileges';
export interface RequireAlertingPrivilegeProps {
    /**
     * Set of features whose UI capability is required to view the children. The
     * user must hold every feature's capability (AND semantics).
     */
    features: readonly AlertingV2Feature[];
    /** Human-readable name of the gated page, surfaced in the interstitial. */
    pageName: string;
    /**
     * The gate requires the `write` (all) capability for every
     * feature instead of the minimum `read` capability.
     */
    capability?: 'all' | 'read';
    children: React.ReactNode;
}
/**
 * Gates an alerting_v2 management app behind the user's feature privileges.
 * Renders a "Privileges required" interstitial when the user lacks the minimum
 * `read` capability for the required feature set, otherwise renders the children.
 */
export declare const RequireAlertingPrivilege: ({ features, pageName, capability, children, }: RequireAlertingPrivilegeProps) => React.JSX.Element;
