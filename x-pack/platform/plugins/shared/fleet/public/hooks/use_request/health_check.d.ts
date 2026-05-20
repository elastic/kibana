import type { PostHealthCheckRequest, PostHealthCheckResponse } from '../../types';
export declare function sendPostHealthCheck(body: PostHealthCheckRequest['body']): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<PostHealthCheckResponse, import("./use_request").RequestError>>;
