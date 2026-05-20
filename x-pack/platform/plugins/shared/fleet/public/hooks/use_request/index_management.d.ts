import type { GetDataStreamsResponse } from '../../types';
import { type RequestError } from './use_request';
export declare const useGetPipeline: (pipelineId: string) => import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GetDataStreamsResponse, RequestError>;
export declare const useGetComponentTemplateQuery: (componentTemplateName: string) => import("@kbn/react-query").UseQueryResult<{
    name: string;
} | null, RequestError>;
