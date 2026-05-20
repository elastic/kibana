import type { FleetProxy } from '../models';
import type { ListResult } from './common';
export type GetFleetProxiesResponse = ListResult<FleetProxy>;
export interface PostFleetProxiesRequest {
    body: {
        name: string;
        url: string;
        proxy_headers?: {
            [k: string]: string | boolean | number;
        };
        certificate_autorithies?: string;
        certificate?: string;
        certificate_key?: string;
    };
}
export interface PutFleetProxiesRequest {
    body: {
        name?: string;
        url?: string;
        proxy_headers?: {
            [k: string]: string | boolean | number;
        };
        certificate_autorithies?: string;
        certificate?: string;
        certificate_key?: string;
    };
}
