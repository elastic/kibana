import type { ConnectorAuthStatusMap } from '@kbn/actions-types';
import type { ActionsClientContext } from '../../../../../actions_client';
export interface GetAuthStatusParams {
    context: ActionsClientContext;
}
export type GetAuthStatusResult = ConnectorAuthStatusMap;
