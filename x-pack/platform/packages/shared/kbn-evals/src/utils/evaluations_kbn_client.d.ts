import type { ToolingLog } from '@kbn/tooling-log';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { KbnClient } from '@kbn/kbn-client';
export interface GetEvaluationsKbnClientParams {
    kbnClient: KbnClient;
    log: ToolingLog;
    evaluationsKbnUrl?: string;
    evaluationsKbnApiKey?: string;
    createKbnClient?: (args: {
        log: ToolingLog;
        url: string;
    }) => KbnClient;
}
export declare function withKbnClientDefaultHeaders(kbnClient: KbnClient, defaultHeaders: Record<string, string>): KbnClient;
export declare function withKbnClientApiKeyAuth(kbnClient: KbnClient, apiKey: string): KbnClient;
export declare function getEvaluationsKbnClient({ kbnClient, log, evaluationsKbnUrl, evaluationsKbnApiKey, createKbnClient, }: GetEvaluationsKbnClientParams): KbnClient;
/**
 * Probes the target Kibana to check whether the evals plugin is enabled
 * by hitting a lightweight datasets list endpoint.
 */
export declare function checkEvaluationsPluginEnabled({ kbnClient, log, }: {
    kbnClient: KbnClient;
    log: SomeDevLog;
}): Promise<boolean>;
