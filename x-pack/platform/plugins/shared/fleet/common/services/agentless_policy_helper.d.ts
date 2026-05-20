import { AgentlessDeploymentReleaseStatus } from '../types';
import type { IntegrationCardReleaseLabel, NewPackagePolicyInput, PackageInfo, RegistryPolicyTemplate } from '../types';
/**
 * Returns true when the given package/integration/version combination predates the `release`
 * field convention and should be treated as GA regardless of an absent release field.
 */
export declare const isGABeforeReleaseField: (packageName: string | undefined, integrationName: string | undefined, version: string | undefined) => boolean;
export interface RegistryInputForDeploymentMode {
    type: string;
    policy_template?: string;
    deployment_modes?: string[];
}
export declare const isAgentlessIntegration: (packageInfo: Pick<PackageInfo, "policy_templates"> | undefined, integrationToEnable?: string) => boolean;
export declare const getAgentlessAgentPolicyNameFromPackagePolicyName: (packagePolicyName: string) => string;
export declare const isOnlyAgentlessIntegration: (packageInfo?: Pick<PackageInfo, "policy_templates">, integrationToEnable?: string) => boolean;
export declare const isOnlyAgentlessPolicyTemplate: (policyTemplate: RegistryPolicyTemplate) => boolean;
export declare function isInputAllowedForDeploymentMode(input: Pick<NewPackagePolicyInput, 'type' | 'policy_template'>, deploymentMode: 'default' | 'agentless', packageInfo?: PackageInfo): boolean;
export declare function validateDeploymentModesForInputs(inputs: Array<Pick<NewPackagePolicyInput, 'type' | 'enabled' | 'policy_template'>>, deploymentMode: 'default' | 'agentless', packageInfo?: PackageInfo): void;
/** The default agentless release when no `release` field is present. Flip to GA when agentless GAs platform-wide. */
export declare const AGENTLESS_DEPLOYMENT_RELEASE_DEFAULT = AgentlessDeploymentReleaseStatus.Beta;
/**
 * Returns the release label for the agentless deployment of a given integration, or `undefined`
 * when agentless is not applicable (not enabled for this integration).
 * Single only-agentless templates defer to package semver per spec (no `release` field allowed).
 * An absent `release` field on other agentless templates defaults to `AGENTLESS_DEPLOYMENT_RELEASE_DEFAULT`.
 */
export declare const getAgentlessRelease: (packageInfo: Pick<PackageInfo, "name" | "version" | "policy_templates">, integrationToEnable?: string) => IntegrationCardReleaseLabel | undefined;
/**
 * Derive global data tags for agentless agent policies from package agentless info.
 */
export declare const getAgentlessGlobalDataTags: (packageInfo?: PackageInfo) => {
    name: string;
    value: string;
}[] | undefined;
