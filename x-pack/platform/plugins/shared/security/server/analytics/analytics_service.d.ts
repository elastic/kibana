import type { AnalyticsServiceSetup as CoreAnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { CSPViolationReport, PermissionsPolicyViolationReport } from '../routes/analytics/record_violations';
export declare const AUTHENTICATION_TYPE_EVENT_TYPE = "security_authentication_type";
export declare const CSP_VIOLATION_EVENT_TYPE = "security_csp_violation";
export declare const PERMISSIONS_POLICY_VIOLATION_EVENT_TYPE = "security_permissions_policy_violation";
export interface AnalyticsServiceSetupParams {
    analytics: CoreAnalyticsServiceSetup;
}
export interface AnalyticsServiceSetup {
    /**
     * Registers event describing the type of the authentication used to authenticate user's request.
     * @param event Instance of the AuthenticationTypeEvent.
     */
    reportAuthenticationTypeEvent(event: AuthenticationTypeAnalyticsEvent): void;
    /**
     * Registers CSP violation sent by the user's browser using Reporting API.
     * @param event Instance of the AuthenticationTypeEvent.
     */
    reportCSPViolation(event: CSPViolationEvent): void;
    /**
     * Registers CSP violation sent by the user's browser using Reporting API.
     * @param event Instance of the AuthenticationTypeEvent.
     */
    reportPermissionsPolicyViolation(event: PermissionsPolicyViolationEvent): void;
}
/**
 * Interface that represents how CSP violations are stored as EBT events.
 */
export type CSPViolationEvent = FlattenReport<CSPViolationReport>;
/**
 * Interface that represents how permissions policy violations are stored as EBT events.
 */
export type PermissionsPolicyViolationEvent = FlattenReport<PermissionsPolicyViolationReport>;
/**
 * Describes the shape of the authentication type event.
 */
export interface AuthenticationTypeAnalyticsEvent {
    /**
     * Type of the Kibana authentication provider (`basic`, `saml`, `pki` etc.).
     */
    authenticationProviderType: string;
    /**
     * Type of the Elasticsearch security realm (`native`, `ldap`, `file` etc.).
     */
    authenticationRealmType: string;
    /**
     * If user is authenticated using HTTP authentication this field will include
     * HTTP authentication scheme (`Basic`, `Bearer`, `ApiKey` etc.).
     */
    httpAuthenticationScheme?: string;
}
/**
 * Properties that all Reporting API schemas share.
 */
interface CommonReportFields {
    type: string;
    age?: number;
    body: {};
}
/**
 * Helper type that transforms any Reporting API schema into its corresponding EBT schema:
 *
 * - Removes `type` property since events are identified by their `eventType` in EBT.
 * - Replaces `age` property with `created` timestamp so that we capture a fully qualified date.
 * - Spreads `body` property to keep the resulting EBT schema flat.
 */
type FlattenReport<T extends CommonReportFields> = {
    created: string;
} & Omit<T, keyof CommonReportFields> & T['body'];
/**
 * Service that interacts with the Core's analytics module to collect usage of
 * the various Security plugin features (e.g. type of the authentication used).
 */
export declare class AnalyticsService {
    private readonly logger;
    constructor(logger: Logger);
    setup({ analytics }: AnalyticsServiceSetupParams): AnalyticsServiceSetup;
}
export {};
