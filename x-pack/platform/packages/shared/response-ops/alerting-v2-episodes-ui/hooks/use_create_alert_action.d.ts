import type { HttpStart } from '@kbn/core-http-browser';
import { type AlertEpisodeActionType } from '@kbn/alerting-v2-schemas';
interface CreateAlertActionParams {
    groupHash: string;
    actionType: AlertEpisodeActionType;
    body?: Record<string, unknown>;
}
export declare const useCreateAlertAction: (http: HttpStart) => import("@kbn/react-query").UseMutationResult<void, unknown, CreateAlertActionParams, unknown>;
export {};
