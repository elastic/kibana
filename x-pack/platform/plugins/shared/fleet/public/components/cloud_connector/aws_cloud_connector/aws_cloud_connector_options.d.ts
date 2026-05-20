import type { PackagePolicyConfigRecord } from '../../../../common';
export interface AwsCloudConnectorOptions {
    id: string;
    label: string;
    type?: 'text' | 'password';
    dataTestSubj: string;
    isSecret?: boolean;
    value: string;
}
export declare const getAwsCloudConnectorsCredentialsFormOptions: (inputVars?: PackagePolicyConfigRecord | undefined) => ({
    label: string;
    type?: "text" | "password" | undefined;
    isSecret?: boolean | undefined;
    dataTestSubj: string;
} & {
    value: string;
    id: string;
    dataTestSubj: string;
})[] | undefined;
