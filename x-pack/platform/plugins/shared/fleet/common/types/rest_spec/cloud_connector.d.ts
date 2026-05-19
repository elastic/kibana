import type { CloudConnector, CloudProvider, CloudConnectorVars, AccountType } from '../models/cloud_connector';
export interface CreateCloudConnectorRequest {
    name: string;
    namespace?: string;
    vars: CloudConnectorVars;
    cloudProvider: CloudProvider;
    accountType?: AccountType;
}
export interface UpdateCloudConnectorRequest {
    name?: string;
    vars?: CloudConnectorVars;
    cloudProvider?: CloudProvider;
    accountType?: AccountType;
}
export interface GetCloudConnectorsResponse {
    items: CloudConnector[];
}
export interface GetOneCloudConnectorResponse {
    item: CloudConnector;
}
export interface CreateCloudConnectorResponse {
    item: CloudConnector;
}
export interface UpdateCloudConnectorResponse {
    item: CloudConnector;
}
export interface DeleteCloudConnectorResponse {
    id: string;
}
export interface CloudConnectorUsageItem {
    id: string;
    name: string;
    package?: {
        name: string;
        title: string;
        version: string;
    };
    policy_ids: string[];
    created_at: string;
    updated_at: string;
}
export interface GetCloudConnectorUsageResponse {
    items: CloudConnectorUsageItem[];
    total: number;
    page: number;
    perPage: number;
}
