import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
export declare class DynamicConnectorsPoller {
    private readonly logger;
    private readonly client;
    private readonly actions;
    private readonly pollingIntervalMs;
    private readonly polling$;
    private subscription;
    constructor(logger: Logger, actions: ActionsPluginStartContract, client: ElasticsearchClient, pollingIntervalMins: number);
    start(): void;
    stop(): void;
    private createPollingObservable;
    private pollBegin;
    private fetchInferenceEndpoints;
    private handleInferenceEndpointsResponse;
    private resolveDynamicConnectorSync;
    private applyDynamicConnectorSync;
    private handleError;
}
