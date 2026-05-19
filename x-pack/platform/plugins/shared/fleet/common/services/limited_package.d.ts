import type { PackageInfo, AgentPolicy } from '../types';
export declare const isPackageLimited: (packageInfo: PackageInfo) => boolean;
export declare const doesAgentPolicyAlreadyIncludePackage: (agentPolicy: AgentPolicy, packageName: string) => boolean;
