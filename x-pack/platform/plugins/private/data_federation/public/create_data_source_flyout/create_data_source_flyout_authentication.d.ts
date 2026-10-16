import type { DataSourceType, DataSourceWithSecrets } from '../../common/datasource_types';
/** S3 authentication modes (UI-only). */
export type S3AuthenticationMode = 'anonymous' | 'access_and_secret_keys' | 'federated_identity';
/** GCS authentication modes (UI-only). */
export type GcsAuthenticationMode = 'anonymous' | 'access_and_secret_keys' | 'federated_identity';
/** Azure authentication modes (UI-only). */
export type AzureAuthenticationMode = 'anonymous' | 'credentials' | 'federated_identity';
export type CreateDataSourceAuthenticationMode = S3AuthenticationMode | GcsAuthenticationMode | AzureAuthenticationMode;
export declare const DATA_SOURCE_TYPES_WITH_AUTHENTICATION: ReadonlySet<DataSourceType>;
export declare const getDefaultAuthenticationMode: (dataSourceType: DataSourceType, { enableFederatedIdentity }?: {
    enableFederatedIdentity?: boolean;
}) => CreateDataSourceAuthenticationMode;
/**
 * Documentation page for each authentication method, as a key into
 * `docLinks.links.dataFederation`. The pages describe the method itself, so they are the
 * same regardless of data source type.
 */
export declare const AUTHENTICATION_DOC_LINK_KEYS: {
    readonly federated_identity: 'federatedIdentity';
    readonly access_and_secret_keys: 'staticCredentials';
    readonly credentials: 'staticCredentials';
    readonly anonymous: 'quickstart';
};
export declare const showsAuthenticationCredentialFields: (mode: CreateDataSourceAuthenticationMode, dataSourceType: DataSourceType) => boolean;
/** Applies UI authentication mode to the payload submitted to the API. */
export declare const applyAuthenticationModeToDataSource: (data: DataSourceWithSecrets, mode: CreateDataSourceAuthenticationMode) => DataSourceWithSecrets;
