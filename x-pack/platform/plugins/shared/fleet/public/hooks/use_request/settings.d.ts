import type { PutSettingsResponse, PutSettingsRequest, GetSettingsResponse, GetEnrollmentSettingsRequest, GetEnrollmentSettingsResponse, GetSpaceSettingsResponse } from '../../types';
import type { RequestError } from './use_request';
export declare function useGetSettingsQuery(options?: {
    enabled?: boolean;
}): import("@kbn/react-query").UseQueryResult<GetSettingsResponse, RequestError>;
export declare function useGetSettings(): import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GetSettingsResponse, RequestError>;
export declare function useGetSpaceSettings({ enabled }: {
    enabled?: boolean;
}): import("@kbn/react-query").UseQueryResult<GetSpaceSettingsResponse, RequestError>;
export declare function sendGetSettings(): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetSettingsResponse, RequestError>>;
export declare function usePutSettingsMutation(): import("@kbn/react-query").UseMutationResult<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<PutSettingsResponse, RequestError>, unknown, Partial<Omit<import("../../types").Settings, "id">>, unknown>;
export declare function useMigrateSpaceAwarenessMutation(): import("@kbn/react-query").UseMutationResult<any, unknown, void, unknown>;
export declare function sendPutSettings(body: PutSettingsRequest['body']): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<PutSettingsResponse, RequestError>>;
export declare function useGetEnrollmentSettings(query?: GetEnrollmentSettingsRequest['query']): import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GetEnrollmentSettingsResponse, RequestError>;
export declare function sendGetEnrollmentSettings(query?: GetEnrollmentSettingsRequest['query']): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetEnrollmentSettingsResponse, RequestError>>;
