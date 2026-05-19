import type { BuildFlavor } from '@kbn/config';
import type { Capabilities, FatalErrorsSetup, StartServicesAccessor } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { AuthenticationServiceSetup } from '@kbn/security-plugin-types-public';
import type { SecurityLicense } from '../../common';
import type { ConfigType } from '../config';
import type { PluginStartDependencies } from '../plugin';
export interface ManagementAppConfigType {
    userManagementEnabled?: boolean;
    roleManagementEnabled?: boolean;
    roleMappingManagementEnabled?: boolean;
}
interface SetupParams {
    management: ManagementSetup;
    license: SecurityLicense;
    authc: AuthenticationServiceSetup;
    fatalErrors: FatalErrorsSetup;
    getStartServices: StartServicesAccessor<PluginStartDependencies>;
    buildFlavor: BuildFlavor;
}
interface StartParams {
    capabilities: Capabilities;
}
export declare class ManagementService {
    private license;
    private licenseFeaturesSubscription?;
    private securitySection?;
    private readonly userManagementEnabled;
    private readonly roleManagementEnabled;
    private readonly roleMappingManagementEnabled;
    constructor(config: ConfigType);
    setup({ getStartServices, management, authc, license, fatalErrors, buildFlavor }: SetupParams): void;
    start({ capabilities }: StartParams): void;
    stop(): void;
}
export {};
