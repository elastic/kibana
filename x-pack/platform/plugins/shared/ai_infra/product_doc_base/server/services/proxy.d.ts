import { type Dispatcher } from 'undici';
export interface ArtifactRepositoryProxySettings {
    proxyUrl: string;
    proxyHeaders?: Record<string, string>;
    proxyRejectUnauthorizedCertificates?: boolean;
}
interface RequestInitWithDispatcher extends RequestInit {
    dispatcher?: Dispatcher;
}
/**
 * Get fetch options for making HTTP requests.
 * If proxyUrl is defined, use it as a proxy for requests to targetUrl.
 * If proxyUrl is not defined, return empty options (direct request to targetUrl).
 */
export declare function getFetchOptions(targetUrl: string, proxyUrl?: string): RequestInitWithDispatcher;
export {};
