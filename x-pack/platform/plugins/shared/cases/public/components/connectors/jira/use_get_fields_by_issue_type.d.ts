import type { HttpSetup } from '@kbn/core/public';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ServerError } from '../../../types';
import type { ActionConnector } from '../../../../common/types/domain';
import type { Fields } from './types';
interface Props {
    http: HttpSetup;
    issueType: string | null;
    connector?: ActionConnector;
}
export declare const useGetFieldsByIssueType: ({ http, connector, issueType }: Props) => import("@kbn/react-query").UseQueryResult<ActionTypeExecutorResult<Fields>, ServerError>;
export type UseGetFieldsByIssueType = ReturnType<typeof useGetFieldsByIssueType>;
export {};
