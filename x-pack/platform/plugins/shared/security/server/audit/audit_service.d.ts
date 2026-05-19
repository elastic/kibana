import type { HttpServiceSetup, KibanaRequest, Logger, LoggerContextConfigInput, LoggingServiceSetup } from '@kbn/core/server';
import type { AuditEvent, AuditServiceSetup } from '@kbn/security-plugin-types-server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import type { SecurityLicense, SecurityLicenseFeatures } from '../../common';
import type { ConfigType } from '../config';
import type { SecurityPluginSetup } from '../plugin';
export declare const ECS_VERSION = "1.6.0";
export declare const RECORD_USAGE_INTERVAL: number;
interface AuditServiceSetupParams {
    license: SecurityLicense;
    config: ConfigType['audit'];
    logging: Pick<LoggingServiceSetup, 'configure'>;
    http: Pick<HttpServiceSetup, 'registerOnPostAuth'>;
    getCurrentUser(request: KibanaRequest): ReturnType<SecurityPluginSetup['authc']['getCurrentUser']> | undefined;
    getSID(request: KibanaRequest): Promise<string | undefined>;
    getSpaceId(request: KibanaRequest): ReturnType<SpacesPluginSetup['spacesService']['getSpaceId']> | undefined;
    recordAuditLoggingUsage(): void;
}
export declare class AuditService {
    private logger;
    private usageIntervalId?;
    constructor(_logger: Logger);
    setup({ license, config, logging, http, getCurrentUser, getSID, getSpaceId, recordAuditLoggingUsage, }: AuditServiceSetupParams): AuditServiceSetup;
    stop(): void;
}
export declare const createLoggingConfig: (config: ConfigType["audit"]) => import("rxjs").OperatorFunction<Pick<SecurityLicenseFeatures, "allowAuditLogging">, LoggerContextConfigInput>;
/**
 * Evaluates the list of provided ignore rules, and filters out events only
 * if *all* rules match the event.
 *
 * For event fields that can contain an array of multiple values, every value
 * must be matched by an ignore rule for the event to be excluded.
 */
export declare function filterEvent(event: AuditEvent, ignoreFilters: ConfigType['audit']['ignore_filters']): boolean;
/**
 * Extracts `X-Forwarded-For` header(s) from `KibanaRequest`.
 */
export declare function getForwardedFor(request: KibanaRequest): string | undefined;
export {};
