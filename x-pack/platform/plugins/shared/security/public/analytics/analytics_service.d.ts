import type { AnalyticsServiceSetup as CoreAnalyticsServiceSetup, HttpSetup, HttpStart } from '@kbn/core/public';
import type { AuthenticationServiceSetup } from '@kbn/security-plugin-types-public';
import type { SecurityLicense } from '../../common';
interface AnalyticsServiceSetupParams {
    securityLicense: SecurityLicense;
    analytics: CoreAnalyticsServiceSetup;
    authc: AuthenticationServiceSetup;
    http: HttpSetup;
    cloudId?: string;
}
interface AnalyticsServiceStartParams {
    http: HttpStart;
}
export declare class AnalyticsService {
    static AuthTypeInfoStorageKey: string;
    private securityLicense;
    private securityFeaturesSubscription?;
    setup({ analytics, authc, cloudId, http, securityLicense }: AnalyticsServiceSetupParams): void;
    start({ http }: AnalyticsServiceStartParams): void;
    stop(): void;
    private static recordAuthTypeAnalytics;
}
export {};
