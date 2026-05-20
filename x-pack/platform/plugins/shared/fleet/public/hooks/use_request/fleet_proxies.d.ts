import type { GetFleetProxiesResponse, PostFleetProxiesRequest, PutFleetProxiesRequest } from '../../../common/types/rest_spec/fleet_proxies';
export declare function useGetFleetProxies(): import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GetFleetProxiesResponse, import("./use_request").RequestError>;
export declare function sendDeleteFleetProxy(proxyId: string): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, import("./use_request").RequestError>>;
export declare function sendPostFleetProxy(body: PostFleetProxiesRequest['body']): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, import("./use_request").RequestError>>;
export declare function sendPutFleetProxy(proxyId: string, body: PutFleetProxiesRequest['body']): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, import("./use_request").RequestError>>;
