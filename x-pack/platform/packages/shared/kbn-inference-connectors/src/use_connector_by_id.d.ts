import type { UseQueryResult } from '@kbn/react-query';
import type { IHttpFetchError, HttpSetup } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import type { AIConnector } from './types';
export interface UseConnectorByIdProps {
    http: HttpSetup;
    connectorId: string | undefined;
    toasts?: IToasts;
}
export type UseConnectorByIdResult = UseQueryResult<AIConnector | undefined, IHttpFetchError>;
export declare const useConnectorById: ({ http, connectorId, toasts, }: UseConnectorByIdProps) => UseConnectorByIdResult;
