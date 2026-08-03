import type { ApplicationStart } from '@kbn/core/public';
import { type AlertingV2Feature, type AlertingV2UICapabilityFor } from '../../common/feature_privileges';
/**
 * Typed read-only view over `application.capabilities` for alerting_v2 features.
 *
 * This gates **UI capabilities only**. A `true` result means the capability is
 * surfaced to the current user in the UI; it is NOT an authorization boundary.
 * Server routes must still enforce authorization independently. In particular,
 * `canWrite()` is not a permission check for a mutation.
 *
 * Closed for modification: new (sub-)feature UI capabilities defined in the
 * feature-privileges schema become usable immediately via the generic `can()`
 * method without editing this service. Do not add feature-specific helpers
 * here; keep those next to the UI flow that needs them.
 */
export declare class UserCapabilities {
    private readonly application;
    constructor(application: ApplicationStart);
    /** Returns whether the given UI capability is granted for the feature. */
    can<F extends AlertingV2Feature>(feature: F, capability: AlertingV2UICapabilityFor<F>): boolean;
    /**
     * Returns whether the user can read the feature. Granted when either the
     * top-level write/all or read capability is set, since `all` implies `read`.
     */
    canRead(feature: AlertingV2Feature): boolean;
    /** Returns whether the feature's top-level write/all capability is granted. */
    canWrite(feature: AlertingV2Feature): boolean;
}
