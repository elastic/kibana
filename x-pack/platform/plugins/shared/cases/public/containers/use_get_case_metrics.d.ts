import type { SingleCaseMetricsFeature } from './types';
import type { ServerError } from '../types';
export declare const useGetCaseMetrics: (caseId: string, features: SingleCaseMetricsFeature[]) => import("@kbn/react-query").UseQueryResult<{
    metrics: {
        alerts?: {
            count?: number | undefined;
            hosts?: {
                total: number;
                values: {
                    name: string | undefined;
                    id: string;
                    count: number;
                }[];
            } | undefined;
            users?: {
                total: number;
                values: {
                    name: string;
                    count: number;
                }[];
            } | undefined;
        } | undefined;
        connectors?: {
            total: number;
        } | undefined;
        actions?: {
            isolateHost?: {
                isolate: {
                    total: number;
                };
                unisolate: {
                    total: number;
                };
            } | undefined;
        } | undefined;
        lifespan?: {
            creationDate: string;
            closeDate: string | null;
            statusInfo: {
                openDuration: number;
                inProgressDuration: number;
                reopenDates: string[];
            };
        } | undefined;
    };
}, ServerError>;
