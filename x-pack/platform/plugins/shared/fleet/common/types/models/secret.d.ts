import type { PackagePolicyConfigRecordEntry } from '../..';
export interface Secret {
    id: string;
}
export interface SecretElasticDoc {
    value: string;
}
export type VarSecretReference = {
    isSecretRef: true;
} & ({
    id: string;
} | {
    ids: string[];
});
export interface SecretPath {
    path: string[];
    value: PackagePolicyConfigRecordEntry;
}
export interface SOSecretPath {
    path: string;
    value: string | {
        id: string;
    };
}
export type SOSecret = string | {
    id: string;
    hash?: string;
};
export interface SecretReference {
    id: string;
}
export interface DeletedSecretResponse {
    deleted: boolean;
}
export interface DeletedSecretReference {
    id: string;
    deleted: boolean;
}
export interface BaseSSLSecrets {
    ssl?: {
        key?: SOSecret;
    };
}
