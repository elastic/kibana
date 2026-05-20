export declare const TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR = "ACCOUNT_TYPE";
export declare const TEMPLATE_URL_ELASTIC_RESOURCE_ID_ENV_VAR = "RESOURCE_ID";
export declare const CLOUD_FORMATION_TEMPLATE_URL_CLOUD_CONNECTORS = "cloud_formation_cloud_connectors_template";
export declare const ARM_TEMPLATE_URL_CLOUD_CONNECTORS = "arm_template_cloud_connectors_url";
export declare const CLOUD_SHELL_URL_CLOUD_CONNECTORS = "cloud_shell_url_cloud_connectors";
export declare const AWS_PROVIDER = "aws";
export declare const GCP_PROVIDER = "gcp";
export declare const AZURE_PROVIDER = "azure";
export { SINGLE_ACCOUNT, ORGANIZATION_ACCOUNT, AWS_ACCOUNT_TYPE_VAR_NAME as AWS_ACCOUNT_TYPE_INPUT_VAR_NAME, AZURE_ACCOUNT_TYPE_VAR_NAME as AZURE_ACCOUNT_TYPE_INPUT_VAR_NAME, GCP_ACCOUNT_TYPE_VAR_NAME as GCP_ACCOUNT_TYPE_INPUT_VAR_NAME, } from '../../../common';
export declare const TABS: {
    readonly NEW_CONNECTION: "new-connection";
    readonly EXISTING_CONNECTION: "existing-connection";
};
export declare const CLOUD_FORMATION_EXTERNAL_DOC_URL = "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html";
export declare const AWS_CLOUD_CONNECTOR_FIELD_NAMES: {
    readonly ROLE_ARN: "role_arn";
    readonly EXTERNAL_ID: "external_id";
    readonly AWS_ROLE_ARN: "aws.role_arn";
    readonly AWS_EXTERNAL_ID: "aws.credentials.external_id";
};
export declare const SUPPORTS_CLOUD_CONNECTORS_VAR_NAME = "supports_cloud_connectors";
export declare const AZURE_CLOUD_CONNECTOR_FIELD_NAMES: {
    readonly TENANT_ID: "tenant_id";
    readonly CLIENT_ID: "client_id";
    readonly AZURE_TENANT_ID: "azure.credentials.tenant_id";
    readonly AZURE_CLIENT_ID: "azure.credentials.client_id";
    readonly AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID: "azure_credentials_cloud_connector_id";
};
export declare const GCP_CLOUD_CONNECTOR_FIELD_NAMES: {
    readonly SERVICE_ACCOUNT: "service_account";
    readonly AUDIENCE: "audience";
    readonly GCP_SERVICE_ACCOUNT: "gcp.credentials.service_account_email";
    readonly GCP_AUDIENCE: "gcp.credentials.audience";
    readonly GCP_CREDENTIALS_CLOUD_CONNECTOR_ID: "gcp_credentials_cloud_connector_id";
};
export declare const CLOUD_CONNECTOR_AWS_CSPM_REUSABLE_MIN_VERSION = "3.1.0-preview06";
export declare const CLOUD_CONNECTOR_AWS_ASSET_INVENTORY_REUSABLE_MIN_VERSION = "1.1.5";
export declare const CLOUD_CONNECTOR_AZURE_CSPM_REUSABLE_MIN_VERSION = "3.1.0";
export declare const CLOUD_CONNECTOR_AZURE_ASSET_INVENTORY_REUSABLE_MIN_VERSION = "1.2.2";
export declare const CLOUD_CONNECTOR_GCP_CSPM_REUSABLE_MIN_VERSION = "3.3.0-preview06";
export declare const CLOUD_CONNECTOR_GCP_ASSET_INVENTORY_REUSABLE_MIN_VERSION = "1.5.0-preview04";
