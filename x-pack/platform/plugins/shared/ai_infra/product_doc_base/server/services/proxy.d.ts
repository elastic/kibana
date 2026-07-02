import type { Agent as HttpAgent } from 'http';
import type { Agent as HttpsAgent } from 'https';
interface RequestInitWithAgent extends RequestInit {
    agent?: HttpAgent | HttpsAgent;
}
export interface ArtifactRepositoryProxySettings {
    proxyUrl: string;
    proxyHeaders?: Record<string, string>;
    proxyRejectUnauthorizedCertificates?: boolean;
}
/**
 * Get fetch options for making HTTP requests.
 * If proxyUrl is defined, use it as a proxy for requests to targetUrl.
 * If proxyUrl is not defined, return empty options (direct request to targetUrl).
 */
export declare function getFetchOptions(targetUrl: string, proxyUrl?: string): RequestInitWithAgent;
export {};
