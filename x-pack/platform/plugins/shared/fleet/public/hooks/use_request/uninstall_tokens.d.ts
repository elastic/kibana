import type { GetUninstallTokensMetadataRequest, GetUninstallTokensMetadataResponse, GetUninstallTokenResponse } from '../../../common/types/rest_spec/uninstall_token';
import type { RequestError } from './use_request';
export declare const useGetUninstallTokens: (query?: GetUninstallTokensMetadataRequest["query"]) => import("@kbn/react-query").UseQueryResult<GetUninstallTokensMetadataResponse, RequestError>;
export declare const useGetUninstallToken: (uninstallTokenId: string) => import("@kbn/react-query").UseQueryResult<GetUninstallTokenResponse, RequestError>;
export declare const sendGetUninstallToken: (uninstallTokenId: string) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetUninstallTokenResponse, RequestError>>;
export declare function getUninstallTokenValue(uninstallTokenId: string): Promise<string>;
