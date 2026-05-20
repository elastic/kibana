import type { FleetAuthzRouter } from '../../services/security';
export declare const ListDataStreamsResponseSchema: import("@kbn/config-schema").ObjectType<{
    data_streams: import("@kbn/config-schema").Type<Readonly<{} & {
        type: string;
        namespace: string;
        index: string;
        package: string;
        dashboards: Readonly<{} & {
            id: string;
            title: string;
        }>[];
        dataset: string;
        size_in_bytes: number;
        package_version: string;
        last_activity_ms: number;
        size_in_bytes_formatted: string | number;
        serviceDetails: Readonly<{} & {
            environment: string;
            serviceName: string;
        }> | null;
    }>[]>;
}>;
export declare const registerRoutes: (router: FleetAuthzRouter) => void;
