import type { TypeOf } from '@kbn/config-schema';
import type { Logger } from '@kbn/core/server';
export declare enum AllowedHosts {
    Any = "*"
}
export declare enum EnabledActionTypes {
    Any = "*"
}
export declare const DEFAULT_QUEUED_MAX = 1000000;
declare const enabledConnectorTypesSchema: import("@kbn/config-schema").Type<string[]>;
declare const rateLimiterSchema: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
    limit: number;
    lookbackWindow: string;
}>>>;
declare const oauthAuthorizationCodeRateLimitsSchema: import("@kbn/config-schema").ObjectType<{
    authorize: import("@kbn/config-schema").ObjectType<{
        lookbackWindow: import("@kbn/config-schema").Type<string>;
        limit: import("@kbn/config-schema").Type<number>;
    }>;
    callback: import("@kbn/config-schema").ObjectType<{
        lookbackWindow: import("@kbn/config-schema").Type<string>;
        limit: import("@kbn/config-schema").Type<number>;
    }>;
}>;
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    allowedHosts: import("@kbn/config-schema").Type<string[]>;
    enabledActionTypes: import("@kbn/config-schema").Type<string[]>;
    preconfiguredAlertHistoryEsIndex: import("@kbn/config-schema").Type<boolean>;
    preconfigured: import("@kbn/config-schema").Type<Record<string, Readonly<{
        exposeConfig?: boolean | undefined;
    } & {
        config: Record<string, any>;
        name: string;
        actionTypeId: string;
        secrets: Record<string, any>;
    }>>>;
    proxyUrl: import("@kbn/config-schema").Type<string | undefined>;
    proxyHeaders: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
    proxyBypassHosts: import("@kbn/config-schema").Type<string[] | undefined>;
    proxyOnlyHosts: import("@kbn/config-schema").Type<string[] | undefined>;
    ssl: import("@kbn/config-schema").Type<Readonly<{
        verificationMode?: "full" | "none" | "certificate" | undefined;
        proxyVerificationMode?: "full" | "none" | "certificate" | undefined;
    } & {}> | undefined>;
    maxResponseContentLength: import("@kbn/config-schema").Type<import("@kbn/config-schema").ByteSizeValue>;
    responseTimeout: import("@kbn/config-schema").Type<import("moment").Duration>;
    customHostSettings: import("@kbn/config-schema").Type<Readonly<{
        ssl?: Readonly<{
            verificationMode?: "full" | "none" | "certificate" | undefined;
            certificateAuthoritiesFiles?: string | string[] | undefined;
            certificateAuthoritiesData?: string | undefined;
        } & {}> | undefined;
        smtp?: Readonly<{
            ignoreTLS?: boolean | undefined;
            requireTLS?: boolean | undefined;
        } & {}> | undefined;
    } & {
        url: string;
    }>[] | undefined>;
    microsoftGraphApiUrl: import("@kbn/config-schema").Type<string>;
    microsoftGraphApiScope: import("@kbn/config-schema").Type<string>;
    microsoftExchangeUrl: import("@kbn/config-schema").Type<string>;
    email: import("@kbn/config-schema").Type<Readonly<{
        services?: Readonly<{
            enabled?: ("other" | "*" | "google-mail" | "microsoft-exchange" | "microsoft-outlook" | "amazon-ses" | "elastic-cloud")[] | undefined;
            ses?: Readonly<{} & {
                port: number;
                host: string;
            }> | undefined;
        } & {}> | undefined;
        domain_allowlist?: string[] | undefined;
        recipient_allowlist?: string[] | undefined;
        maximum_body_length?: number | undefined;
    } & {}> | undefined>;
    run: import("@kbn/config-schema").Type<Readonly<{
        maxAttempts?: number | undefined;
        connectorTypeOverrides?: Readonly<{
            maxAttempts?: number | undefined;
        } & {
            id: string;
        }>[] | undefined;
    } & {}> | undefined>;
    enableFooterInEmail: import("@kbn/config-schema").Type<boolean>;
    queued: import("@kbn/config-schema").Type<Readonly<{
        max?: number | undefined;
    } & {}> | undefined>;
    usage: import("@kbn/config-schema").Type<Readonly<{
        url?: string | undefined;
        enabled?: boolean | undefined;
        ca?: Readonly<{} & {
            path: string;
        }> | undefined;
    } & {}> | undefined>;
    webhook: import("@kbn/config-schema").Type<Readonly<{} & {
        ssl: Readonly<{} & {
            pfx: Readonly<{} & {
                enabled: boolean;
            }>;
        }>;
    }> | undefined>;
    rateLimiter: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
        limit: number;
        lookbackWindow: string;
    }>> | undefined>;
    auth: import("@kbn/config-schema").ObjectType<{
        oauth_authorization_code: import("@kbn/config-schema").ObjectType<{
            rate_limits: import("@kbn/config-schema").ObjectType<{
                authorize: import("@kbn/config-schema").ObjectType<{
                    lookbackWindow: import("@kbn/config-schema").Type<string>;
                    limit: import("@kbn/config-schema").Type<number>;
                }>;
                callback: import("@kbn/config-schema").ObjectType<{
                    lookbackWindow: import("@kbn/config-schema").Type<string>;
                    limit: import("@kbn/config-schema").Type<number>;
                }>;
            }>;
        }>;
        ears: import("@kbn/config-schema").Type<Readonly<{
            url?: string | undefined;
        } & {
            enabled: boolean;
        }> | undefined>;
    }>;
}>;
export type ActionsConfig = TypeOf<typeof configSchema>;
export type EnabledConnectorTypes = TypeOf<typeof enabledConnectorTypesSchema>;
export type ConnectorRateLimiterConfig = TypeOf<typeof rateLimiterSchema>;
export type OAuthRateLimiterConfig = TypeOf<typeof oauthAuthorizationCodeRateLimitsSchema>;
export declare function getValidatedConfig(logger: Logger, originalConfig: ActionsConfig): ActionsConfig;
export {};
