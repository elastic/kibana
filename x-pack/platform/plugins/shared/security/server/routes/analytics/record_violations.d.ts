import type { TypeOf } from '@kbn/config-schema';
import type { RouteDefinitionParams } from '..';
/**
 * # Tracking CSP violations
 *
 * Add the following settings to your `kibana.dev.yml`:
 *
 * ```yml
 * server.customResponseHeaders.Reporting-Endpoints: violations-endpoint="https://localhost:5601/xyz/internal/security/analytics/_record_violations"
 * csp.report_to: [violations-endpoint]
 * ```
 *
 * Note: The endpoint has to be on HTTPS and has to be a fully qualified URL including protocol and
 * hostname, otherwise browsers might not send any reports. When using `server.publicBaseUrl` setting
 * you should use the same origin for the reporting endpoint since Kibana does not support
 * cross-origin content negotiation so browsers would not be able to send any report.
 *
 * # Debugging CSP violations
 *
 * CSP violations are tracked (batched) using event based telemetry.
 *
 * To print telemetry events to the terminal add the following config to your `kibana.dev.yml`:
 *
 * ```yml
 * logging.loggers:
 *   - name: analytics
 *     level: all
 *     appenders: [console]
 * ```
 */
/**
 * Schema that validates CSP violation reports according to W3C spec.
 *
 * https://www.w3.org/TR/CSP3/#reporting
 */
declare const cspViolationReportSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"csp-violation">;
    age: import("@kbn/config-schema").Type<number | undefined>;
    url: import("@kbn/config-schema").Type<string>;
    user_agent: import("@kbn/config-schema").Type<string | undefined>;
    body: import("@kbn/config-schema").ObjectType<{
        documentURL: import("@kbn/config-schema").Type<string>;
        referrer: import("@kbn/config-schema").Type<string | undefined>;
        blockedURL: import("@kbn/config-schema").Type<string | undefined>;
        effectiveDirective: import("@kbn/config-schema").Type<string>;
        originalPolicy: import("@kbn/config-schema").Type<string>;
        sourceFile: import("@kbn/config-schema").Type<string | undefined>;
        sample: import("@kbn/config-schema").Type<string | undefined>;
        disposition: import("@kbn/config-schema").Type<"report" | "enforce">;
        statusCode: import("@kbn/config-schema").Type<number>;
        lineNumber: import("@kbn/config-schema").Type<number | undefined>;
        columnNumber: import("@kbn/config-schema").Type<number | undefined>;
    }>;
}>;
/**
 * Interface that represents a CSP violation report according to W3C spec.
 */
export type CSPViolationReport = TypeOf<typeof cspViolationReportSchema>;
/**
 * Schema that validates permissions policy violation reports according to W3C spec.
 *
 * https://w3c.github.io/webappsec-permissions-policy/#reporting
 */
export declare const permissionsPolicyViolationReportSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"permissions-policy-violation">;
    age: import("@kbn/config-schema").Type<number | undefined>;
    url: import("@kbn/config-schema").Type<string>;
    user_agent: import("@kbn/config-schema").Type<string | undefined>;
    body: import("@kbn/config-schema").ObjectType<{
        /**
         * The string identifying the policy-controlled feature whose policy has been violated. This string can be used for grouping and counting related reports.
         * Spec mentions featureId, however the report that is sent from Chrome has policyId. This is to handle both cases.
         */
        policyId: import("@kbn/config-schema").Type<string | undefined>;
        /**
         * The string identifying the policy-controlled feature whose policy has been violated. This string can be used for grouping and counting related reports.
         */
        featureId: import("@kbn/config-schema").Type<string | undefined>;
        /**
         * If known, the file where the violation occured, or null otherwise.
         */
        sourceFile: import("@kbn/config-schema").Type<string | undefined>;
        /**
         * If known, the line number in sourceFile where the violation occured, or null otherwise.
         */
        lineNumber: import("@kbn/config-schema").Type<number | undefined>;
        /**
         * If known, the column number in sourceFile where the violation occured, or null otherwise.
         */
        columnNumber: import("@kbn/config-schema").Type<number | undefined>;
        /**
         * A string indicating whether the violated permissions policy was enforced in this case. disposition will be set to "enforce" if the policy was enforced, or "report" if the violation resulted only in this report being generated (with no further action taken by the user agent in response to the violation).
         */
        disposition: import("@kbn/config-schema").Type<"report" | "enforce">;
    }>;
}>;
/**
 * Interface that represents a permissions policy violation report according to W3C spec.
 */
export type PermissionsPolicyViolationReport = TypeOf<typeof permissionsPolicyViolationReportSchema>;
/**
 * This endpoint receives reports from the user's browser via the Reporting API when one of our
 * `Content-Security-Policy` or `Permissions-Policy` directives have been violated.
 */
export declare function defineRecordViolations({ router, analyticsService }: RouteDefinitionParams): void;
export {};
