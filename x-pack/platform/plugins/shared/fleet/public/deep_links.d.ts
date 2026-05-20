import type { AppDeepLink } from '@kbn/core/public';
import type { ExperimentalFeatures } from '../common/experimental_features';
import type { FleetAuthz } from '../common';
export declare enum FleetDeepLinkId {
    agents = "agents",
    policies = "policies",
    enrollmentTokens = "enrollment_tokens",
    uninstallTokens = "uninstall_tokens",
    dataStreams = "data_streams",
    settings = "settings"
}
export declare const getFleetDeepLinks: (experimentalFeatures: ExperimentalFeatures, authz?: FleetAuthz) => AppDeepLink[];
