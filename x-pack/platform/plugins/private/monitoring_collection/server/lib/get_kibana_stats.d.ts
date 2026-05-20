import type { ServiceStatus } from '@kbn/core/server';
export declare function getKibanaStats({ config, getStatus, }: {
    config: {
        kibanaIndex: string;
        kibanaVersion: string;
        uuid: string;
        server: {
            name: string;
            hostname: string;
            port: number;
        };
    };
    getStatus: () => ServiceStatus<unknown> | undefined;
}): {
    uuid: string;
    name: string;
    index: string;
    host: string;
    locale: string;
    transport_address: string;
    version: string;
    snapshot: boolean;
    status: string;
};
