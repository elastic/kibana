import type { GetFleetStatusResponse } from '../../types';
import type { RequestError } from './use_request';
export declare const sendSetup: () => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, RequestError>>;
export declare const sendGetFleetStatus: () => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetFleetStatusResponse, RequestError>>;
export declare const useGetFleetStatusQuery: () => import("@kbn/react-query").UseQueryResult<GetFleetStatusResponse, RequestError>;
export declare const sendPostFleetSetup: ({ forceRecreate }: {
    forceRecreate: boolean;
}) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, RequestError>>;
