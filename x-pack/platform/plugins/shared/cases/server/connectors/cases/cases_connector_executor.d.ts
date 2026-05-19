import type { Logger } from '@kbn/core/server';
import type { CasesConnectorRunParams } from './types';
import type { CasesOracleService } from './cases_oracle_service';
import type { CasesService } from './cases_service';
import type { CasesClient } from '../../client';
interface CasesConnectorExecutorParams {
    logger: Logger;
    casesOracleService: CasesOracleService;
    casesService: CasesService;
    casesClient: CasesClient;
    spaceId: string;
    isCasesAttachmentsEnabled?: boolean;
}
export declare class CasesConnectorExecutor {
    private readonly logger;
    private readonly casesOracleService;
    private readonly casesService;
    private readonly casesClient;
    private readonly spaceId;
    private readonly isCasesAttachmentsEnabled;
    constructor({ logger, casesOracleService, casesService, casesClient, spaceId, isCasesAttachmentsEnabled, }: CasesConnectorExecutorParams);
    execute(params: CasesConnectorRunParams): Promise<void>;
    private pushCaseUpdates;
    private groupAlerts;
    private generateNoGroupAlertGrouping;
    private applyCircuitBreakers;
    private removeGrouping;
    private generateOracleKeys;
    private upsertOracleRecords;
    private handleTimeWindow;
    private increaseOracleRecordCounter;
    private isTimeWindowPassed;
    private generateCaseIds;
    private upsertCases;
    private getCreateCaseRequest;
    private getCasesTitle;
    private getCaseDescription;
    private getCaseTags;
    private getGroupingAsTags;
    private handleClosedCases;
    private reopenClosedCases;
    private createNewCasesOutOfClosedCases;
    private attachCommentAndAlertsToCases;
    private handleAndThrowErrors;
    private getLogMetadata;
    private getCustomFieldsAndTemplatesConfiguration;
}
export {};
