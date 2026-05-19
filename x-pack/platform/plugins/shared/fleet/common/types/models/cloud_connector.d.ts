import type { NewPackagePolicy, PackagePolicyConfigRecord, PackagePolicyConfigRecordEntry } from './package_policy';
export type CloudProvider = 'aws' | 'azure' | 'gcp';
/**
 * Type guard to check if a value is a valid CloudProvider.
 */
export declare const isCloudProvider: (value: unknown) => value is CloudProvider;
export type AccountType = 'single-account' | 'organization-account';
export interface CloudConnectorSecretReference {
    isSecretRef: boolean;
    id: string;
}
export interface CloudConnectorVar {
    type?: 'text';
    value: string;
}
export interface CloudConnectorSecretVar {
    type?: 'password';
    value: CloudConnectorSecretReference;
    frozen?: boolean;
}
export interface AwsCloudConnectorVars {
    role_arn: CloudConnectorVar;
    external_id: CloudConnectorSecretVar;
}
export interface AzureCloudConnectorVars {
    tenant_id: CloudConnectorSecretVar;
    client_id: CloudConnectorSecretVar;
    azure_credentials_cloud_connector_id: CloudConnectorVar;
}
export interface GcpCloudConnectorVars {
    service_account: CloudConnectorVar;
    audience: CloudConnectorVar;
    gcp_credentials_cloud_connector_id: CloudConnectorSecretVar;
}
export type CloudConnectorVars = AwsCloudConnectorVars | AzureCloudConnectorVars | GcpCloudConnectorVars;
export type VerificationStatus = 'pending' | 'success' | 'failed';
export interface CloudConnector {
    id: string;
    name: string;
    cloudProvider: CloudProvider;
    accountType?: AccountType;
    vars: CloudConnectorVars;
    packagePolicyCount?: number;
    created_at: string;
    updated_at: string;
    namespace?: string;
    verification_status?: VerificationStatus;
    verification_started_at?: string;
    verification_failed_at?: string;
}
export interface CloudConnectorListOptions {
    page?: number;
    perPage?: number;
    kuery?: string;
    fields?: string[];
}
/**
 * A package policy that belongs to a cloud connector.
 * Narrows cloud_connector_id and cloud_connector_name to required non-null strings.
 */
export interface CloudConnectorPackagePolicy extends NewPackagePolicy {
    cloud_connector_id: string;
    cloud_connector_name: string;
    supports_cloud_connector: true;
    supports_agentless: true;
}
/**
 * Typed stream vars for the verifier_otel package, matching the manifest.
 * Extends PackagePolicyConfigRecord so it can be used directly as stream vars.
 * All `required: true` vars in the manifest are documented in VERIFIER_REQUIRED_VARS.
 */
export type VerifierStreamVars = PackagePolicyConfigRecord & {
    'data_stream.dataset': PackagePolicyConfigRecordEntry;
    identity_federation_id: PackagePolicyConfigRecordEntry;
    verification_id: PackagePolicyConfigRecordEntry;
    verification_type: PackagePolicyConfigRecordEntry;
    provider: PackagePolicyConfigRecordEntry;
    policy_id: PackagePolicyConfigRecordEntry;
    policy_templates: PackagePolicyConfigRecordEntry;
    package_name: PackagePolicyConfigRecordEntry;
};
/**
 * Required manifest var names for the verifier_otel package.
 * If any of these are missing the verifier OTel collector will fail to start.
 */
export declare const VERIFIER_REQUIRED_VARS: readonly string[];
