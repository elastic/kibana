import type { Observable } from 'rxjs';
import type { BuildFlavor } from '@kbn/config/src/types';
import type { DocLinksServiceSetup, HttpResources, I18nServiceSetup, IBasePath, Logger } from '@kbn/core/server';
import type { KibanaFeature } from '@kbn/features-plugin/server';
import type { SubFeaturePrivilegeIterator } from '@kbn/features-plugin/server/feature_privilege_iterator';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { SecurityLicense } from '../../common';
import type { AnalyticsServiceSetup } from '../analytics';
import type { AnonymousAccessServiceStart } from '../anonymous_access';
import type { InternalAuthenticationServiceStart } from '../authentication';
import type { AuthorizationServiceSetupInternal } from '../authorization';
import type { ConfigType } from '../config';
import type { SecurityFeatureUsageServiceStart } from '../feature_usage';
import type { Session } from '../session_management';
import type { SecurityRouter } from '../types';
import type { UserProfileServiceStartInternal } from '../user_profile';
/**
 * Describes parameters used to define HTTP routes.
 */
export interface RouteDefinitionParams {
    router: SecurityRouter;
    basePath: IBasePath;
    httpResources: HttpResources;
    logger: Logger;
    config: ConfigType;
    config$: Observable<ConfigType>;
    authz: AuthorizationServiceSetupInternal;
    getSession: () => PublicMethodsOf<Session>;
    license: SecurityLicense;
    getFeatures: () => Promise<KibanaFeature[]>;
    subFeaturePrivilegeIterator: SubFeaturePrivilegeIterator;
    getFeatureUsageService: () => SecurityFeatureUsageServiceStart;
    getAuthenticationService: () => InternalAuthenticationServiceStart;
    getUserProfileService: () => UserProfileServiceStartInternal;
    getAnonymousAccessService: () => AnonymousAccessServiceStart;
    analyticsService: AnalyticsServiceSetup;
    buildFlavor: BuildFlavor;
    docLinks: DocLinksServiceSetup;
    i18n: I18nServiceSetup;
}
export declare function defineRoutes(params: RouteDefinitionParams): void;
