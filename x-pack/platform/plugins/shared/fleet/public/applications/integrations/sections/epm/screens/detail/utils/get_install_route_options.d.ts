import type { CreatePackagePolicyRouteState } from '../../../../../types';
interface GetInstallPkgRouteOptionsParams {
    currentPath: string;
    integration: string | null;
    agentPolicyId?: string;
    pkgkey: string;
    isCloud: boolean;
    isFirstTimeAgentUser: boolean;
    isAgentlessIntegration?: boolean;
    isAgentlessByDefault?: boolean;
    prerelease?: boolean;
}
export type InstallPkgRouteOptions = [
    string,
    {
        path: string;
        state: CreatePackagePolicyRouteState;
    }
];
export declare const getInstallPkgRouteOptions: ({ currentPath, integration, agentPolicyId, pkgkey, isFirstTimeAgentUser, isCloud, isAgentlessIntegration, isAgentlessByDefault, prerelease, }: GetInstallPkgRouteOptionsParams) => InstallPkgRouteOptions;
export {};
