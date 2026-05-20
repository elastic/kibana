import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import type { HttpsProxyAgentOptions } from 'https-proxy-agent';
export interface RegistryProxySettings {
    proxyUrl: string;
    proxyHeaders?: Record<string, string>;
    proxyRejectUnauthorizedCertificates?: boolean;
}
type ProxyAgent = HttpsProxyAgent | HttpProxyAgent;
type GetProxyAgentParams = RegistryProxySettings & {
    targetUrl: string;
};
export declare function getRegistryProxyUrl(): string | undefined;
export declare function getProxyAgent(options: GetProxyAgentParams): ProxyAgent;
export declare function getProxyAgentOptions(options: GetProxyAgentParams): HttpsProxyAgentOptions;
export {};
