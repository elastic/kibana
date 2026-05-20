import type { HttpSetup } from '@kbn/core/public';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ActionConnector } from '../../../../common/types/domain';
import type { Issue } from './types';
import type { ServerError } from '../../../types';
interface Props {
    http: HttpSetup;
    id: string;
    actionConnector?: ActionConnector;
}
export declare const useGetIssue: ({ http, actionConnector, id }: Props) => import("@kbn/react-query").UseQueryResult<ActionTypeExecutorResult<Issue>, ServerError>;
export type UseGetIssueTypes = ReturnType<typeof useGetIssue>;
export {};
