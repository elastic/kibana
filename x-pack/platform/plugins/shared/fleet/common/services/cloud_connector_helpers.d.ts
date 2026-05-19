import type { AwsCloudConnectorVars, AzureCloudConnectorVars, CloudConnectorVars } from '../types/models/cloud_connector';
/**
 * Type guard to check if vars object contains AWS cloud connector variables
 */
export declare function isAwsCloudConnectorVars(vars: Partial<CloudConnectorVars>): vars is AwsCloudConnectorVars;
/**
 * Type guard to check if vars object contains Azure cloud connector variables
 */
export declare function isAzureCloudConnectorVars(vars: Partial<CloudConnectorVars>): vars is AzureCloudConnectorVars;
