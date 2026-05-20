import type { PackagePolicyConfigRecord } from '../../../../common';
export interface GcpCloudConnectorOptions {
    id: string;
    label: string;
    type?: 'text' | 'password';
    dataTestSubj: string;
    isSecret?: boolean;
    value: string;
    helpText?: string;
    tooltip?: string;
}
export declare const getGcpCloudConnectorsCredentialsFormOptions: (inputVars?: PackagePolicyConfigRecord | undefined) => ({
    label: string;
    type?: "text" | "password" | undefined;
    isSecret?: boolean | undefined;
    dataTestSubj: string;
} & {
    value: string;
    id: string;
    dataTestSubj: string;
})[] | undefined;
