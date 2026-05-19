import type { Logger } from '@kbn/logging';
import type { UsageRecord } from './types';
/**
 * Config shape accepted by UsageReportingService.
 *
 * When supplied by the Usage API plugin, `url` is already the full endpoint.
 * When falling back to the plugin's own config, the caller must append the
 * endpoint path before passing the config here.
 */
export interface UsageReportingConfig {
    enabled: boolean;
    url?: string;
    tls?: {
        certificate: string;
        key: string;
        ca: string;
    };
}
/**
 * HTTP client for sending UsageRecords to the Usage API.
 *
 * Based on the pattern from security_solution_serverless UsageReportingService.
 * Supports mTLS authentication required by the Usage API in cloud environments.
 */
export declare class UsageReportingService {
    private agent;
    private readonly config;
    private readonly kibanaVersion;
    private readonly logger;
    constructor({ config, kibanaVersion, logger, }: {
        config: UsageReportingConfig;
        kibanaVersion: string;
        logger: Logger;
    });
    /**
     * Sends a usage record with inline retry and exponential backoff.
     * Per billing team guidance: data loss is preferable to overbilling,
     * so we retry a few times then give up (logged at error level).
     */
    reportUsage(records: UsageRecord[]): Promise<void>;
    private _sendUsage;
    private get usageApiUrl();
    private get httpsAgent();
}
