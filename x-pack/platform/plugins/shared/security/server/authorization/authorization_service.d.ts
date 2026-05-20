import type { Observable } from 'rxjs';
import type { CapabilitiesSetup, CustomBrandingSetup, HttpServiceSetup, IClusterClient, KibanaRequest, LoggerFactory } from '@kbn/core/server';
import type { FeaturesPluginSetup as FeaturesPluginSetup, FeaturesPluginStart as FeaturesPluginStart } from '@kbn/features-plugin/server';
import { Actions, type PrivilegesService } from '@kbn/security-authorization-core';
import type { AuthorizationMode, AuthorizationServiceSetup, CheckPrivilegesDynamicallyWithRequest, CheckSavedObjectsPrivilegesWithRequest, CheckUserProfilesPrivileges } from '@kbn/security-plugin-types-server';
import type { AuthenticatedUser, SecurityLicense } from '../../common';
import type { OnlineStatusRetryScheduler } from '../elasticsearch';
import type { SpacesService } from '../plugin';
export { Actions } from '@kbn/security-authorization-core';
interface AuthorizationServiceSetupParams {
    packageVersion: string;
    http: HttpServiceSetup;
    capabilities: CapabilitiesSetup;
    getClusterClient: () => Promise<IClusterClient>;
    license: SecurityLicense;
    loggers: LoggerFactory;
    features: FeaturesPluginSetup;
    kibanaIndexName: string;
    getSpacesService(): SpacesService | undefined;
    getCurrentUser(request: KibanaRequest): AuthenticatedUser | null;
    customBranding: CustomBrandingSetup;
}
interface AuthorizationServiceStartParams {
    features: FeaturesPluginStart;
    clusterClient: IClusterClient;
    online$: Observable<OnlineStatusRetryScheduler>;
}
export interface AuthorizationServiceSetupInternal extends AuthorizationServiceSetup {
    actions: Actions;
    checkUserProfilesPrivileges: (userProfileUids: Set<string>) => CheckUserProfilesPrivileges;
    checkPrivilegesDynamicallyWithRequest: CheckPrivilegesDynamicallyWithRequest;
    checkSavedObjectsPrivilegesWithRequest: CheckSavedObjectsPrivilegesWithRequest;
    applicationName: string;
    mode: AuthorizationMode;
    privileges: PrivilegesService;
}
export declare class AuthorizationService {
    private logger;
    private applicationName;
    private privileges;
    private statusSubscription?;
    setup({ http, capabilities, packageVersion, getClusterClient, license, loggers, features, kibanaIndexName, getSpacesService, getCurrentUser, customBranding, }: AuthorizationServiceSetupParams): AuthorizationServiceSetupInternal;
    start({ clusterClient, features, online$ }: AuthorizationServiceStartParams): void;
    stop(): void;
}
