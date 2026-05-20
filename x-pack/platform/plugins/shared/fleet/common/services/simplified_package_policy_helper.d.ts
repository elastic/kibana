import type { AgentConditionExpression, NewPackagePolicyInput, PackagePolicy, NewPackagePolicy, PackageInfo, ExperimentalDataStreamFeature } from '../types';
export type SimplifiedVars = Record<string, string | string[] | boolean | number | number[] | null | {
    isSecretRef: boolean;
    id: string;
}>;
export type SimplifiedPackagePolicyStreams = Record<string, {
    enabled?: undefined | boolean;
    vars?: SimplifiedVars;
    condition?: AgentConditionExpression;
}>;
export type SimplifiedInputs = Record<string, {
    enabled?: boolean | undefined;
    vars?: SimplifiedVars;
    streams?: SimplifiedPackagePolicyStreams;
    condition?: AgentConditionExpression;
}>;
export interface SimplifiedPackagePolicy {
    id?: string;
    policy_id?: string | null;
    policy_ids: string[];
    output_id?: string;
    cloud_connector_id?: string | null;
    namespace: string;
    name: string;
    description?: string;
    vars?: SimplifiedVars;
    var_group_selections?: Record<string, string>;
    inputs?: SimplifiedInputs;
    supports_agentless?: boolean | null;
    supports_cloud_connector?: boolean | null;
    additional_datastreams_permissions?: string[] | null;
    global_data_tags?: Array<{
        name: string;
        value: string | number;
    }> | null;
    condition?: AgentConditionExpression;
}
export interface FormattedPackagePolicy extends Omit<PackagePolicy, 'inputs' | 'vars'> {
    inputs?: SimplifiedInputs;
    vars?: SimplifiedVars;
}
export interface FormattedCreatePackagePolicyResponse {
    item: FormattedPackagePolicy;
}
export declare function packagePolicyToSimplifiedPackagePolicy(packagePolicy: PackagePolicy): FormattedPackagePolicy;
export declare function generateInputId(input: NewPackagePolicyInput): string;
export declare function formatInputs(inputs: NewPackagePolicy['inputs'], supportsAgentless?: boolean, packageInfo?: PackageInfo): SimplifiedInputs | undefined;
export declare function formatVars(vars: NewPackagePolicy['inputs'][number]['vars']): SimplifiedVars | undefined;
export declare function simplifiedPackagePolicytoNewPackagePolicy(data: SimplifiedPackagePolicy, packageInfo: PackageInfo, options?: {
    experimental_data_stream_features?: ExperimentalDataStreamFeature[];
    policyTemplate?: string;
}): NewPackagePolicy;
