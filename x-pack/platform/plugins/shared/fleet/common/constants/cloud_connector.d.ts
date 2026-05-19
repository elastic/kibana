import type { CloudProvider } from '../types/models/cloud_connector';
export declare const AWS_ROLE_ARN_VAR_NAME = "aws.role_arn";
export declare const AWS_CREDENTIALS_EXTERNAL_ID_VAR_NAME = "aws.credentials.external_id";
export declare const ROLE_ARN_VAR_NAME = "role_arn";
export declare const EXTERNAL_ID_VAR_NAME = "external_id";
export declare const AZURE_TENANT_ID_VAR_NAME = "azure.credentials.tenant_id";
export declare const AZURE_CLIENT_ID_VAR_NAME = "azure.credentials.client_id";
export declare const AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID_VAR_NAME = "azure.credentials.azure_credentials_cloud_connector_id";
export declare const TENANT_ID_VAR_NAME = "tenant_id";
export declare const CLIENT_ID_VAR_NAME = "client_id";
export declare const AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID = "azure_credentials_cloud_connector_id";
export declare const GCP_SERVICE_ACCOUNT_VAR_NAME = "gcp.credentials.service_account_email";
export declare const GCP_AUDIENCE_VAR_NAME = "gcp.credentials.audience";
export declare const GCP_CREDENTIALS_CLOUD_CONNECTOR_ID_VAR_NAME = "gcp.credentials.gcp_credentials_cloud_connector_id";
export declare const SERVICE_ACCOUNT_VAR_NAME = "service_account";
export declare const AUDIENCE_VAR_NAME = "audience";
export declare const GCP_CREDENTIALS_CLOUD_CONNECTOR_ID = "gcp_credentials_cloud_connector_id";
export declare const SUPPORTS_CLOUD_CONNECTORS_VAR_NAME = "supports_cloud_connectors";
export declare const VERIFIER_PKG_NAME = "verifier_otel";
export declare const VERIFIER_POLICY_TEMPLATE = "verifierreceiver";
export declare const VERIFIER_INPUT_TYPE = "otelcol";
export declare const VERIFIER_DATA_STREAM_TYPE = "logs";
export declare const VERIFIER_DATASET = "verifier_otel.verifierreceiver";
export declare const CLOUD_CONNECTOR_HIDDEN_PACKAGES: readonly string[];
/** Default page size for listing cloud connectors (service + HTTP API). */
export declare const CLOUD_CONNECTOR_LIST_DEFAULT_PER_PAGE = 20;
/**
 * Appends NOT package.name filters for {@link CLOUD_CONNECTOR_HIDDEN_PACKAGES} and
 * `latest_revision:true` to a package-policy Kuery fragment (same pattern as usage routes;
 * latest revision excludes rollback snapshot rows such as `:prev`).
 */
export declare function buildPackagePolicyFilterExcludingHiddenPackages(baseFilter: string): string;
export declare const AWS_ACCOUNT_TYPE_VAR_NAME = "aws.account_type";
export declare const AZURE_ACCOUNT_TYPE_VAR_NAME = "azure.account_type";
export declare const GCP_ACCOUNT_TYPE_VAR_NAME = "gcp.account_type";
export declare const SINGLE_ACCOUNT = "single-account";
export declare const ORGANIZATION_ACCOUNT = "organization-account";
export declare const CLOUD_CONNECTOR_DEFAULT_ACCOUNT_TYPE = "single-account";
export declare const SUPPORTED_CLOUD_CONNECTOR_VARS: string[];
export type PolicyGroup = 'security_audit_policy_group' | 'aws_global_policy_group';
export interface CloudConnectorAllowlistEntry {
    provider: CloudProvider;
    package: string;
    policyTemplate: string;
}
export declare const CLOUD_CONNECTOR_PERMISSION_ALLOWLIST: Record<PolicyGroup, ReadonlyArray<CloudConnectorAllowlistEntry>>;
/**
 * Returns the policy group that a given integration belongs to, or undefined if not in any group.
 */
export declare function getPolicyGroupForIntegration(pkg: string, policyTemplate: string): PolicyGroup | undefined;
