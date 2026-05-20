import type { CloudProvider } from '../../types/models/cloud_connector';
import type { CloudConnectorCredentialSchema, CloudConnectorVarKeyMapping } from './types';
/**
 * AWS cloud connector credential schema
 * Maps logical field names to their actual var key names used in package policies
 */
export declare const AWS_CREDENTIAL_SCHEMA: CloudConnectorCredentialSchema;
/**
 * Azure cloud connector credential schema
 * Maps logical field names to their actual var key names used in package policies
 */
export declare const AZURE_CREDENTIAL_SCHEMA: CloudConnectorCredentialSchema;
/**
 * GCP cloud connector credential schema
 * Maps logical field names to their actual var key names used in package policies.
 * service_account and audience are non-secret text fields (type: text in integration manifests).
 * Only gcp_credentials_cloud_connector_id is a secret.
 */
export declare const GCP_CREDENTIAL_SCHEMA: CloudConnectorCredentialSchema;
/**
 * Map of provider to credential schema
 */
export declare const CREDENTIAL_SCHEMAS: Record<CloudProvider, CloudConnectorCredentialSchema>;
/**
 * Get the credential schema for a given cloud provider
 * @param provider - The cloud provider
 * @returns The credential schema for the provider
 */
export declare function getCredentialSchema(provider: CloudProvider): CloudConnectorCredentialSchema;
/**
 * Get all var keys (primary + aliases) for a given field mapping
 * @param mapping - The var key mapping
 * @returns Array of all possible var key names
 */
export declare function getAllVarKeys(mapping: CloudConnectorVarKeyMapping): string[];
/**
 * Get all supported cloud connector var names across all providers
 * Used for detecting storage mode based on package info vars
 */
export declare function getAllSupportedVarNames(): string[];
/**
 * Gets the credential property name for a given var key name.
 * Handles both primary keys and aliases, mapping them back to the logical credential field name.
 *
 * @param provider - The cloud provider (e.g., 'aws', 'azure')
 * @param varName - The var key name (e.g., 'role_arn' or 'aws.role_arn')
 * @returns The credential property name (e.g., 'roleArn') or undefined if not found
 *
 * @example
 * getCredentialKeyFromVarName('aws', 'role_arn') // → 'roleArn'
 * getCredentialKeyFromVarName('aws', 'aws.role_arn') // → 'roleArn'
 * getCredentialKeyFromVarName('azure', 'tenant_id') // → 'tenantId'
 */
export declare function getCredentialKeyFromVarName(provider: CloudProvider, varName: string): string | undefined;
