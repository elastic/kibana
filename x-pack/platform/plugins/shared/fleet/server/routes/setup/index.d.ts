import type { FleetAuthzRouter } from '../../services/security';
import type { FleetConfigType } from '../../../common/types';
export declare const FleetSetupResponseSchema: import("@kbn/config-schema").ObjectType<{
    isInitialized: import("@kbn/config-schema").Type<boolean>;
    nonFatalErrors: import("@kbn/config-schema").Type<Readonly<{} & {
        name: string;
        message: string;
    }>[]>;
}>;
export declare const registerFleetSetupRoute: (router: FleetAuthzRouter) => void;
export declare const GetAgentsSetupResponseSchema: import("@kbn/config-schema").ObjectType<{
    isReady: import("@kbn/config-schema").Type<boolean>;
    missing_requirements: import("@kbn/config-schema").Type<("api_keys" | "fleet_server" | "security_required" | "tls_required" | "fleet_admin_user")[]>;
    missing_optional_features: import("@kbn/config-schema").Type<"encrypted_saved_object_encryption_key_required"[]>;
    package_verification_key_id: import("@kbn/config-schema").Type<string | undefined>;
    is_space_awareness_enabled: import("@kbn/config-schema").Type<boolean | undefined>;
    is_secrets_storage_enabled: import("@kbn/config-schema").Type<boolean | undefined>;
    is_ssl_secrets_storage_enabled: import("@kbn/config-schema").Type<boolean | undefined>;
    is_action_secrets_storage_enabled: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const registerCreateFleetSetupRoute: (router: FleetAuthzRouter) => void;
export declare const registerGetFleetStatusRoute: (router: FleetAuthzRouter) => void;
export declare const registerRoutes: (router: FleetAuthzRouter, config: FleetConfigType) => void;
