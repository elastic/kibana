import type { OAuthRateLimiterConfig } from '../config';
type OAuthEndpoint = 'authorize' | 'callback';
export declare class OAuthRateLimiter {
    private logsByUserAndEndpoint;
    private readonly config;
    constructor({ config }: {
        config: OAuthRateLimiterConfig;
    });
    log(username: string, endpoint: OAuthEndpoint): void;
    isRateLimited(username: string, endpoint: OAuthEndpoint): boolean;
    getLogs(username: string, endpoint: OAuthEndpoint): number[];
    private cleanupOldLogs;
    private createKey;
}
export {};
