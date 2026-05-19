import type { CaseConnector } from '../../common/types/domain';
import type { ServerError } from '../types';
interface PushToServiceRequest {
    caseId: string;
    connector: CaseConnector;
}
export declare const usePostPushToService: () => import("@kbn/react-query").UseMutationResult<import("./types").CaseUI, ServerError, PushToServiceRequest, unknown>;
export type UsePostPushToService = ReturnType<typeof usePostPushToService>;
export {};
