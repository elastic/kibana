import type { CoreStart, Logger } from '@kbn/core/server';
import type { TelemetryPluginStart, TelemetryPluginSetup } from '@kbn/telemetry-plugin/server';
import type { InfoResponse } from '@elastic/elasticsearch/lib/api/types';
import { TelemetryQueue } from './queue';
import type { FleetTelemetryChannel, FleetTelemetryChannelEvents } from './types';
/**
 * Simplified version of https://github.com/elastic/kibana/blob/master/x-pack/solutions/security/plugins/security_solution/server/lib/telemetry/sender.ts
 * Sends batched events to telemetry v3 api
 */
export declare class TelemetryEventsSender {
    private readonly initialCheckDelayMs;
    private readonly checkIntervalMs;
    private readonly logger;
    private readonly stop$;
    private telemetryStart?;
    private telemetrySetup?;
    private isSending;
    private queuesPerChannel;
    private isOptedIn?;
    private esClient?;
    private clusterInfo?;
    private licenseInfo?;
    constructor(logger: Logger);
    setup(telemetrySetup?: TelemetryPluginSetup): void;
    start(telemetryStart?: TelemetryPluginStart, core?: CoreStart): Promise<void>;
    stop(): void;
    queueTelemetryEvents<T extends FleetTelemetryChannel>(channel: T, events: Array<FleetTelemetryChannelEvents[T]>): void;
    isTelemetryOptedIn(): Promise<boolean>;
    private sendIfDue;
    private fetchClusterInfo;
    private fetchLicenseInfo;
    sendEvents(telemetryUrl: string, clusterInfo: InfoResponse | undefined, queue: TelemetryQueue<any>): Promise<void>;
    private fetchTelemetryUrl;
    private send;
    private transformDataToNdjson;
}
