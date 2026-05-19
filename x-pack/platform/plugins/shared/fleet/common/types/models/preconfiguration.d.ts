import type { SimplifiedPackagePolicy } from '../../services/simplified_package_policy_helper';
import type { PackagePolicyPackage, NewPackagePolicy, NewPackagePolicyInput, PackagePolicyConfigRecordEntry } from './package_policy';
import type { NewAgentPolicy } from './agent_policy';
import type { Output } from './output';
export type InputsOverride = Partial<NewPackagePolicyInput> & {
    vars?: Array<NewPackagePolicyInput['vars'] & {
        name: string;
    }>;
};
export type PreconfiguredVar = PackagePolicyConfigRecordEntry & {
    name: string;
};
export type PreconfiguredInputs = Omit<NewPackagePolicy['inputs'][0], 'vars' | 'streams'> & {
    vars?: Array<PreconfiguredVar>;
    streams?: Array<Omit<NewPackagePolicy['inputs'][0]['streams'][0], 'vars'> & {
        vars?: Array<PreconfiguredVar>;
    }>;
};
export type PreconfiguredPackagePolicy = (Partial<Omit<NewPackagePolicy, 'inputs' | 'package'>> & {
    id?: string | number;
    name: string;
    package: Partial<PackagePolicyPackage> & {
        name: string;
    };
    inputs?: PreconfiguredInputs[];
}) | (Omit<SimplifiedPackagePolicy, 'policy_id'> & {
    id: string;
    package: {
        name: string;
    };
});
export interface PreconfiguredAgentPolicy extends Omit<NewAgentPolicy, 'namespace' | 'id'> {
    id: string | number;
    space_id?: string;
    namespace?: string;
    package_policies: PreconfiguredPackagePolicy[];
}
export interface PreconfiguredPackage extends Omit<PackagePolicyPackage, 'title'> {
    prerelease?: boolean;
    skipDataStreamRollover?: boolean;
}
export interface PreconfiguredOutput extends Omit<Output, 'config_yaml'> {
    config?: Record<string, unknown>;
    allow_edit?: string[];
}
