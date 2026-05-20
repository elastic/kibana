import type { EnrollmentAPIKey } from '../models';
import type { ListResult, ListWithKuery } from './common';
export interface GetEnrollmentAPIKeysRequest {
    query: ListWithKuery;
}
export type GetEnrollmentAPIKeysResponse = ListResult<EnrollmentAPIKey> & {
    list?: EnrollmentAPIKey[];
};
export interface GetOneEnrollmentAPIKeyRequest {
    params: {
        keyId: string;
    };
}
export interface GetOneEnrollmentAPIKeyResponse {
    item: EnrollmentAPIKey;
}
export interface DeleteEnrollmentAPIKeyRequest {
    params: {
        keyId: string;
    };
    query: {
        forceDelete?: boolean;
    };
}
export interface DeleteEnrollmentAPIKeyResponse {
    action: string;
}
export interface PostEnrollmentAPIKeyRequest {
    body: {
        name?: string;
        policy_id: string;
        expiration?: string;
    };
}
export interface PostEnrollmentAPIKeyResponse {
    action: string;
    item: EnrollmentAPIKey;
}
export interface BulkDeleteEnrollmentAPIKeysRequest {
    body: {
        tokenIds?: string[];
        kuery?: string;
        forceDelete?: boolean;
    };
}
export interface BulkDeleteEnrollmentAPIKeysResponse {
    action: string;
    count: number;
    successCount: number;
    errorCount: number;
}
