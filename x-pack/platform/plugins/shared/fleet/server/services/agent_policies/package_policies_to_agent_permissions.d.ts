import type { SecurityIndicesPrivileges } from '@elastic/elasticsearch/lib/api/types';
import type { FullAgentPolicyOutputPermissions, PackageInfo, RegistryDataStreamPrivileges } from '../../../common/types';
import type { FullAgentPolicyInput, PackagePolicy, TemplateAgentPolicyInput } from '../../types';
export declare const DEFAULT_CLUSTER_PERMISSIONS: string[];
export declare const UNIVERSAL_PROFILING_PERMISSIONS: string[];
export declare const ELASTIC_CONNECTORS_INDEX_PERMISSIONS: string[];
export declare const AGENTLESS_INDEX_PERMISSIONS: string[];
export declare function storedPackagePoliciesToAgentPermissions(packageInfoCache: Map<string, PackageInfo>, agentPolicyNamespace: string, packagePolicies?: PackagePolicy[], agentInputs?: FullAgentPolicyInput[] | TemplateAgentPolicyInput[]): FullAgentPolicyOutputPermissions | undefined;
export interface DataStreamMeta {
    type: string;
    dataset: string;
    dataset_is_prefix?: boolean;
    hidden?: boolean;
    elasticsearch?: {
        privileges?: RegistryDataStreamPrivileges;
        dynamic_namespace?: boolean;
        dynamic_dataset?: boolean;
    };
}
export declare function getDataStreamPrivileges(dataStream: DataStreamMeta, namespace?: string): SecurityIndicesPrivileges;
