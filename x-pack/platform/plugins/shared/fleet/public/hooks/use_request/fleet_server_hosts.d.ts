import type { GetFleetServerHostsResponse, PostFleetServerHostsRequest, PutFleetServerHostsRequest, PostFleetServerHostsResponse } from '../../../common/types/rest_spec/fleet_server_hosts';
export declare function useGetFleetServerHosts(): import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GetFleetServerHostsResponse, import("./use_request").RequestError>;
export declare function sendGetOneFleetServerHost(itemId: string): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, import("./use_request").RequestError>>;
export declare function sendDeleteFleetServerHost(itemId: string): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, import("./use_request").RequestError>>;
export declare function sendPutFleetServerHost(itemId: string, body: PutFleetServerHostsRequest['body']): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, import("./use_request").RequestError>>;
export declare function sendPostFleetServerHost(body: PostFleetServerHostsRequest['body']): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<PostFleetServerHostsResponse, import("./use_request").RequestError>>;
