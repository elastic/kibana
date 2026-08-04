import type { HttpStart } from '@kbn/core-http-browser';
import type { BulkCreateAlertActionBody, BulkResponse } from '@kbn/alerting-v2-schemas';
export declare const bulkCreateAlertActions: (http: HttpStart, items: BulkCreateAlertActionBody) => Promise<BulkResponse>;
