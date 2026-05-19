import { type MonitoringCollectionConfig } from '@kbn/metrics-config';
export type { MonitoringCollectionConfig };
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean>;
    opentelemetry: import("@kbn/config-schema").ObjectType<{
        metrics: import("@kbn/config-schema").ObjectType<{
            otlp: import("@kbn/config-schema").ObjectType<{
                url: import("@kbn/config-schema").Type<string | undefined>;
                headers: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
                exportIntervalMillis: import("@kbn/config-schema").Type<number>;
                logLevel: import("@kbn/config-schema").Type<string>;
            }>;
            prometheus: import("@kbn/config-schema").ObjectType<{
                enabled: import("@kbn/config-schema").Type<boolean>;
            }>;
        }>;
    }>;
}>;
export declare function createConfig(config: MonitoringCollectionConfig): Readonly<{} & {
    enabled: boolean;
    opentelemetry: Readonly<{} & {
        metrics: Readonly<{} & {
            otlp: Readonly<{
                url?: string | undefined;
                headers?: Record<string, string> | undefined;
            } & {
                exportIntervalMillis: number;
                logLevel: string;
            }>;
            prometheus: Readonly<{} & {
                enabled: boolean;
            }>;
        }>;
    }>;
}>;
