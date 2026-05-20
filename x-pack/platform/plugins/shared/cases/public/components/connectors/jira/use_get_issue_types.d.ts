import type { HttpSetup } from '@kbn/core/public';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ServerError } from '../../../types';
import type { ActionConnector } from '../../../../common/types/domain';
import type { IssueTypes } from './types';
interface Props {
    http: HttpSetup;
    connector?: ActionConnector;
}
export declare const useGetIssueTypes: ({ http, connector }: Props) => import("@kbn/react-query").UseQueryResult<ActionTypeExecutorResult<IssueTypes>, ServerError>;
export type UseGetIssueTypes = ReturnType<typeof useGetIssueTypes>;
export {};
