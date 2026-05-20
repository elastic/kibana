import type { HttpSetup } from '@kbn/core/public';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ActionConnector } from '../../../../common/types/domain';
import type { Issues } from './types';
import type { ServerError } from '../../../types';
interface Props {
    http: HttpSetup;
    query: string | null;
    actionConnector?: ActionConnector;
    onDebounce?: () => void;
}
export declare const useGetIssues: ({ http, actionConnector, query, onDebounce }: Props) => import("@kbn/react-query").UseQueryResult<ActionTypeExecutorResult<Issues>, ServerError>;
export type UseGetIssues = ReturnType<typeof useGetIssues>;
export {};
