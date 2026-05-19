import type { HttpSetup } from '@kbn/core/public';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ServerError } from '../../../types';
import type { ActionConnector } from '../../../../common/types/domain';
import type { Choice } from './types';
export interface Props {
    http: HttpSetup;
    connector?: ActionConnector;
    fields: string[];
}
export declare const useGetChoices: ({ http, connector, fields }: Props) => import("@kbn/react-query").UseQueryResult<ActionTypeExecutorResult<Choice[]>, ServerError>;
export type UseGetChoices = ReturnType<typeof useGetChoices>;
