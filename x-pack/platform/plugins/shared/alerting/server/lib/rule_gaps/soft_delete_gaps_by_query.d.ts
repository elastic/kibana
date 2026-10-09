import type { Logger } from '@kbn/core/server';
import type { IEventLogClient } from '@kbn/event-log-plugin/server';
export interface SoftDeleteGapsByQueryParams {
    ruleIds: string[];
    eventLogClient: IEventLogClient;
    logger: Logger;
}
export declare const softDeleteGapsByQuery: ({ ruleIds, eventLogClient, logger, }: SoftDeleteGapsByQueryParams) => Promise<void>;
