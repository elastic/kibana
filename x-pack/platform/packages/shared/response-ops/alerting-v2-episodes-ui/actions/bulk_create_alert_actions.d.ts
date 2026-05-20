import type { HttpStart } from '@kbn/core-http-browser';
import type { BulkCreateAlertActionBody } from '@kbn/alerting-v2-schemas';
export interface BulkCreateAlertActionsResponse {
    processed: number;
    total: number;
}
export declare const bulkCreateAlertActions: (http: HttpStart, items: BulkCreateAlertActionBody) => Promise<BulkCreateAlertActionsResponse>;
