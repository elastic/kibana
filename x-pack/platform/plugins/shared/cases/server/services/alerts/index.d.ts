import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MgetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { AlertInfo } from '../../common/types';
import type { RemoveCaseIdFromAlertsRequest, UpdateAlertCasesRequest, UpdateAlertStatusRequest } from '../../client/alerts/types';
import type { AggregationBuilder, AggregationResponse } from '../../client/metrics/types';
export declare class AlertService {
    private readonly scopedClusterClient;
    private readonly logger;
    private readonly alertsClient;
    constructor(scopedClusterClient: ElasticsearchClient, logger: Logger, alertsClient: PublicMethodsOf<AlertsClient>);
    executeAggregations({ aggregationBuilders, alerts, }: {
        aggregationBuilders: Array<AggregationBuilder<unknown>>;
        alerts: AlertIdIndex[];
    }): Promise<AggregationResponse>;
    private static getUniqueIdsIndices;
    updateAlertsStatus(alerts: UpdateAlertStatusRequest[]): Promise<number>;
    private bucketAlerts;
    private static isEmptyAlert;
    private translateStatus;
    private updateByQuery;
    private getNonEmptyAlerts;
    getAlerts(alertsInfo: AlertInfo[]): Promise<MgetResponse<Alert> | undefined>;
    bulkUpdateCases({ alerts, caseIds }: UpdateAlertCasesRequest): Promise<void>;
    removeCaseIdFromAlerts({ alerts, caseId, }: RemoveCaseIdFromAlertsRequest): Promise<void>;
    removeCaseIdsFromAllAlerts({ caseIds }: {
        caseIds: string[];
    }): Promise<void>;
    ensureAlertsAuthorized({ alerts }: {
        alerts: AlertInfo[];
    }): Promise<void>;
}
export interface Alert {
    _id: string;
    _index: string;
    _source: Record<string, unknown>;
}
interface AlertIdIndex {
    id: string;
    index: string;
}
export {};
