import type { CheckPermissionsResponse, GenerateServiceTokenResponse } from '../../types';
export declare const sendGetPermissionsCheck: (fleetServerSetup?: boolean) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<CheckPermissionsResponse, import("./use_request").RequestError>>;
export declare const sendGenerateServiceToken: (remote?: boolean) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GenerateServiceTokenResponse, import("./use_request").RequestError>>;
export declare const usePermissionCheckQuery: () => import("@kbn/react-query").UseQueryResult<CheckPermissionsResponse, "MISSING_PRIVILEGES" | "MISSING_SECURITY" | "MISSING_FLEET_SERVER_SETUP_PRIVILEGES" | undefined>;
export declare const usePermissionCheck: () => import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<CheckPermissionsResponse, import("./use_request").RequestError>;
