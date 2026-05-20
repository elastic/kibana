import type { UninstallToken, UninstallTokenMetadata } from '../models/uninstall_token';
import type { ListResult } from './common';
export interface GetUninstallTokensMetadataRequest {
    query: {
        policyId?: string;
        search?: string;
        perPage?: number;
        page?: number;
    };
}
export type GetUninstallTokensMetadataResponse = ListResult<UninstallTokenMetadata>;
export interface GetUninstallTokenRequest {
    params: {
        uninstallTokenId: string;
    };
}
export interface GetUninstallTokenResponse {
    item: UninstallToken;
}
