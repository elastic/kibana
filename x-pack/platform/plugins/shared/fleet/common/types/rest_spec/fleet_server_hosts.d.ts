import type { FleetServerHost, NewFleetServerHost } from '../models';
import type { ListResult } from './common';
export type GetFleetServerHostsResponse = ListResult<FleetServerHost>;
export interface PutFleetServerHostsRequest {
    params: {
        itemId: string;
    };
    body: Partial<NewFleetServerHost>;
}
export interface PostFleetServerHostsRequest {
    body: Partial<FleetServerHost>;
}
export interface PostFleetServerHostsResponse {
    item: FleetServerHost;
}
