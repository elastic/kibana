import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
export interface GetAlertSnoozeSnapshotParams {
    indices: string[];
    alertId: string;
    ruleId: string;
    fields: string[];
}
interface GetAlertSnoozeSnapshotParamsWithDeps extends GetAlertSnoozeSnapshotParams {
    logger: Logger;
    esClient: ElasticsearchClient;
}
export declare function getAlertSnoozeSnapshot({ indices, alertId, ruleId, fields, logger, esClient, }: GetAlertSnoozeSnapshotParamsWithDeps): Promise<Record<string, unknown> | null>;
export {};
