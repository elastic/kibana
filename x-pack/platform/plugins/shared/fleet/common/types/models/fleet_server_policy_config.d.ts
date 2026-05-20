import type { ValueOf } from '..';
import type { SOSecret } from './secret';
export declare const clientAuth: {
    readonly Optional: "optional";
    readonly Required: "required";
    readonly None: "none";
};
export type ClientAuth = typeof clientAuth;
export interface NewFleetServerHost {
    name: string;
    host_urls: string[];
    is_default: boolean;
    is_preconfigured: boolean;
    is_internal?: boolean;
    proxy_id?: string | null;
    ssl?: {
        certificate_authorities?: string[];
        certificate?: string;
        key?: string;
        es_certificate_authorities?: string[];
        es_certificate?: string;
        es_key?: string;
        client_auth?: ValueOf<ClientAuth>;
        agent_certificate_authorities?: string[];
        agent_certificate?: string;
        agent_key?: string;
    } | null;
    secrets?: {
        ssl?: {
            key?: SOSecret;
            es_key?: SOSecret;
            agent_key?: SOSecret;
        };
    };
}
export interface FleetServerHost extends NewFleetServerHost {
    id: string;
}
