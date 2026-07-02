import type { AxiosError, AxiosResponse } from 'axios';
import type { Logger } from '@kbn/core/server';
export declare class ConnectorUsageCollector {
    private connectorId;
    private usage;
    private logger;
    constructor({ logger, connectorId }: {
        logger: Logger;
        connectorId: string;
    });
    addRequestBodyBytes(result?: AxiosError | AxiosResponse, body?: string | object): void;
    getRequestBodyByte(): number;
}
