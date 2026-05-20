import type { GetDataStreamsResponse } from '../../types';
import type { RequestError } from './use_request';
export declare const useGetDataStreams: () => import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GetDataStreamsResponse, RequestError>;
export declare const sendGetDataStreams: () => Promise<GetDataStreamsResponse | null>;
export declare const useGetDeprecatedILMCheckQuery: () => import("@kbn/react-query").UseQueryResult<Readonly<{} & {
    deprecatedILMPolicies: Readonly<{} & {
        version: number;
        componentTemplates: string[];
        policyName: string;
    }>[];
}>, RequestError>;
