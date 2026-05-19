import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { GetGuards } from '../shared_services';
import type { MlAlertingService } from '../../lib/alerts/alerting_service';
export declare function getAlertingServiceProvider(getGuards: GetGuards): {
    alertingServiceProvider(savedObjectsClient: SavedObjectsClientContract, request: KibanaRequest): {
        preview: (args_0: Readonly<{} & {
            timeRange: string;
            alertParams: Readonly<{} & {
                severity: number;
                jobSelection: Readonly<{} & {
                    jobIds: string[];
                    groupIds: string[];
                }>;
                resultType: "record" | "bucket" | "influencer";
                includeInterim: boolean;
                lookbackInterval: string | null;
                topNBuckets: number | null;
                kqlQueryString: string | null;
            }>;
            sampleSize: number;
        }>) => Promise<any>;
        execute: (params: Readonly<{} & {
            severity: number;
            jobSelection: Readonly<{} & {
                jobIds: string[];
                groupIds: string[];
            }>;
            resultType: "record" | "bucket" | "influencer";
            includeInterim: boolean;
            lookbackInterval: string | null;
            topNBuckets: number | null;
            kqlQueryString: string | null;
        }>, spaceId: string, state?: import("../../lib/alerts/alerting_service").AnomalyDetectionRuleState | undefined) => ReturnType<MlAlertingService["execute"]>;
    };
};
export type MlAlertingServiceProvider = ReturnType<typeof getAlertingServiceProvider>;
