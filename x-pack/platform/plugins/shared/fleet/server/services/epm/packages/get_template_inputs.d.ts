import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PackagePolicyInput, TemplateAgentPolicyInput } from '../../../../common/types';
export declare const templatePackagePolicyToFullInputStreams: (packagePolicyInputs: PackagePolicyInput[], inputAndStreamsIdsMap?: Map<string, {
    originalId: string;
    streams: Map<string, string>;
}>) => TemplateAgentPolicyInput[];
export declare function getTemplateInputs(soClient: SavedObjectsClientContract, pkgName: string, pkgVersion: string, format: 'yml', isInputIncluded?: (input: TemplateAgentPolicyInput) => boolean, prerelease?: boolean, ignoreUnverified?: boolean, injectWiredStreamsRouting?: boolean): Promise<string>;
export declare function getTemplateInputs(soClient: SavedObjectsClientContract, pkgName: string, pkgVersion: string, format: 'json', isInputIncluded?: (input: TemplateAgentPolicyInput) => boolean, prerelease?: boolean, ignoreUnverified?: boolean, injectWiredStreamsRouting?: boolean): Promise<{
    inputs: TemplateAgentPolicyInput[];
}>;
