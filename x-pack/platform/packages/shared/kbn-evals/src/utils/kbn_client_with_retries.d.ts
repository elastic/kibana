import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/kbn-client';
export declare function wrapKbnClientWithRetries({ kbnClient, log, }: {
    kbnClient: KbnClient;
    log: ToolingLog;
}): KbnClient;
