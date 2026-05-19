import type { ConnectorRateLimiterConfig } from '../config';
export declare class ConnectorRateLimiter {
    private logsByConnectors;
    private readonly config?;
    constructor({ config }: {
        config?: ConnectorRateLimiterConfig;
    });
    log(connectorTypeId: string): void;
    isRateLimited(connectorTypeId: string): boolean;
    getLogs(connectorTypeId: string): number[];
    private cleanupOldLogs;
    private trimLeadingDot;
}
