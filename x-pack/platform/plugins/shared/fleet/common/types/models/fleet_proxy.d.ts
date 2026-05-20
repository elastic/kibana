interface BaseFleetProxy {
    name: string;
    url: string;
    certificate_authorities?: string | null;
    certificate?: string | null;
    certificate_key?: string | null;
    is_preconfigured: boolean;
}
export interface NewFleetProxy extends BaseFleetProxy {
    proxy_headers?: Record<string, string | number | boolean> | null;
}
export interface FleetProxy extends NewFleetProxy {
    id: string;
}
export type ProxyConfig = Pick<FleetProxy, 'url'> & {
    proxy_headers?: FleetProxy['proxy_headers'];
};
export {};
