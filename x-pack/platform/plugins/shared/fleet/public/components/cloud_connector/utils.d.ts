import type { PackageInfo, PackagePolicyConfigRecord } from '../../../common';
import type { AwsCloudConnectorVars, AzureCloudConnectorVars, GcpCloudConnectorVars, CloudConnectorVars } from '../../../common/types';
import type { AwsCloudConnectorCredentials, AzureCloudConnectorCredentials, GcpCloudConnectorCredentials, CloudConnectorCredentials, GetCloudConnectorRemoteRoleTemplateParams } from './types';
import { AWS_CLOUD_CONNECTOR_FIELD_NAMES, AZURE_CLOUD_CONNECTOR_FIELD_NAMES, GCP_CLOUD_CONNECTOR_FIELD_NAMES } from './constants';
export type AzureCloudConnectorFieldNames = (typeof AZURE_CLOUD_CONNECTOR_FIELD_NAMES)[keyof typeof AZURE_CLOUD_CONNECTOR_FIELD_NAMES];
export type AwsCloudConnectorFieldNames = (typeof AWS_CLOUD_CONNECTOR_FIELD_NAMES)[keyof typeof AWS_CLOUD_CONNECTOR_FIELD_NAMES];
export type GcpCloudConnectorFieldNames = (typeof GCP_CLOUD_CONNECTOR_FIELD_NAMES)[keyof typeof GCP_CLOUD_CONNECTOR_FIELD_NAMES];
export declare const CLOUD_CONNECTOR_NAME_MAX_LENGTH = 255;
/**
 * Validates a cloud connector name
 * @param name - The name to validate
 * @returns true if the name is valid, false otherwise
 */
export declare const isCloudConnectorNameValid: (name: string | undefined) => boolean;
/**
 * Gets the validation error message for a cloud connector name
 * @param name - The name to validate
 * @returns Error message string or undefined if valid
 */
export declare const getCloudConnectorNameError: (name: string | undefined) => string | undefined;
export declare const isAwsCloudConnectorVars: (vars: CloudConnectorVars, provider: string) => vars is AwsCloudConnectorVars;
export declare function isAwsCredentials(credentials: CloudConnectorCredentials): credentials is AwsCloudConnectorCredentials;
export declare const isAzureCloudConnectorVars: (vars: CloudConnectorVars | PackagePolicyConfigRecord, provider: string) => vars is AzureCloudConnectorVars;
export declare function isAzureCredentials(credentials: CloudConnectorCredentials): credentials is AzureCloudConnectorCredentials;
export declare const isGcpCloudConnectorVars: (vars: CloudConnectorVars | PackagePolicyConfigRecord, provider: string) => vars is GcpCloudConnectorVars;
export declare function isGcpCredentials(credentials: CloudConnectorCredentials): credentials is GcpCloudConnectorCredentials;
export declare function hasValidNewConnectionCredentials(credentials: CloudConnectorCredentials, provider?: string): boolean;
export declare const getDeploymentIdFromUrl: (url: string | undefined) => string | undefined;
export declare const getKibanaComponentId: (cloudId: string | undefined) => string | undefined;
export declare const getTemplateUrlFromPackageInfo: (packageInfo: PackageInfo | undefined, integrationType: string, templateUrlFieldName: string) => string | undefined;
export declare const getCloudConnectorRemoteRoleTemplate: ({ cloud, accountType, iacTemplateUrl, }: GetCloudConnectorRemoteRoleTemplateParams) => string | undefined;
/**
 * Updates input variables with AWS credentials
 */
export declare const updateInputVarsWithAwsCredentials: (inputVars: PackagePolicyConfigRecord | undefined, inputCredentials: AwsCloudConnectorCredentials | undefined) => PackagePolicyConfigRecord | undefined;
/**
 * Updates input variables with Azure credentials
 */
export declare const updateInputVarsWithAzureCredentials: (inputVars: PackagePolicyConfigRecord | undefined, credentials: AzureCloudConnectorCredentials | undefined) => PackagePolicyConfigRecord | undefined;
/**
 * Updates input variables with GCP credentials
 */
export declare const updateInputVarsWithGcpCredentials: (inputVars: PackagePolicyConfigRecord | undefined, credentials: GcpCloudConnectorCredentials | undefined) => PackagePolicyConfigRecord | undefined;
/**
 * Updates input variables with current credentials
 */
export declare const updateInputVarsWithCredentials: (inputVars: PackagePolicyConfigRecord | undefined, credentials: CloudConnectorCredentials | undefined) => PackagePolicyConfigRecord | undefined;
export declare const isCloudConnectorReusableEnabled: (provider: string, packageInfoVersion: string, templateName: string) => boolean;
/**
 * Find a variable definition from package info
 */
export declare const findVariableDef: (packageInfo: PackageInfo, key: string) => import("../../../common").RegistryVarsEntry | undefined;
export declare const fieldIsInvalid: (value: string | undefined, hasInvalidRequiredVars: boolean) => boolean;
