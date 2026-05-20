import type { BuildFlavor } from '@kbn/config';
import type { CustomBrandingSetup, ElasticsearchServiceSetup, HttpServiceSetup, HttpServiceStart, IClusterClient, KibanaRequest, Logger, LoggerFactory } from '@kbn/core/server';
import type { APIKeysType, UiamOAuthType } from '@kbn/core-security-server';
import type { UserActivityServiceStart } from '@kbn/core-user-activity-server';
import type { KibanaFeature } from '@kbn/features-plugin/server';
import type { AuditServiceSetup, AuthenticationServiceStart } from '@kbn/security-plugin-types-server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { AuthenticationResult } from './authentication_result';
import type { ProviderLoginAttempt } from './authenticator';
import type { DeauthenticationResult } from './deauthentication_result';
import type { AuthenticatedUser, SecurityLicense } from '../../common';
import type { ConfigType } from '../config';
import type { SecurityFeatureUsageServiceStart } from '../feature_usage';
import type { Session } from '../session_management';
import type { UiamServicePublic } from '../uiam';
import type { UserProfileServiceStartInternal } from '../user_profile';
interface AuthenticationServiceSetupParams {
    http: Pick<HttpServiceSetup, 'basePath' | 'csp' | 'registerAuth' | 'registerOnPreResponse' | 'staticAssets'>;
    customBranding: CustomBrandingSetup;
    elasticsearch: Pick<ElasticsearchServiceSetup, 'setUnauthorizedErrorHandler'>;
    config: ConfigType;
    license: SecurityLicense;
}
interface AuthenticationServiceStartParams {
    http: Pick<HttpServiceStart, 'auth' | 'basePath' | 'getServerInfo'>;
    config: ConfigType;
    clusterClient: IClusterClient;
    audit: AuditServiceSetup;
    featureUsageService: SecurityFeatureUsageServiceStart;
    userProfileService: UserProfileServiceStartInternal;
    session: PublicMethodsOf<Session>;
    uiam?: UiamServicePublic;
    loggers: LoggerFactory;
    applicationName: string;
    kibanaFeatures: KibanaFeature[];
    isElasticCloudDeployment: () => boolean;
    customLogoutURL?: string;
    buildFlavor?: BuildFlavor;
    userActivity: UserActivityServiceStart;
}
export interface InternalAuthenticationServiceStart extends AuthenticationServiceStart {
    apiKeys: Pick<APIKeysType, 'areAPIKeysEnabled' | 'areCrossClusterAPIKeysEnabled' | 'create' | 'update' | 'invalidate' | 'validate' | 'grantAsInternalUser' | 'cloneAsInternalUser' | 'invalidateAsInternalUser' | 'uiam'>;
    oauth: UiamOAuthType | null;
    login: (request: KibanaRequest, attempt: ProviderLoginAttempt) => Promise<AuthenticationResult>;
    logout: (request: KibanaRequest) => Promise<DeauthenticationResult>;
    acknowledgeAccessAgreement: (request: KibanaRequest) => Promise<void>;
    getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
}
export declare class AuthenticationService {
    private readonly logger;
    private license;
    private authenticator?;
    private session?;
    constructor(logger: Logger);
    setup({ config, http, license, elasticsearch, customBranding, }: AuthenticationServiceSetupParams): void;
    start({ audit, config, clusterClient, featureUsageService, userProfileService, http, loggers, session, applicationName, kibanaFeatures, isElasticCloudDeployment, customLogoutURL, buildFlavor, uiam, userActivity, }: AuthenticationServiceStartParams): InternalAuthenticationServiceStart;
}
export {};
