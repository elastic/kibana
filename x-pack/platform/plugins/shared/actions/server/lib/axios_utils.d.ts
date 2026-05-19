import type { AxiosHeaderValue, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig, Method } from 'axios';
import type { Logger } from '@kbn/core/server';
import type { ProxySettings, SSLSettings } from '@kbn/actions-utils';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorUsageCollector } from '../types';
export declare const request: <T = unknown>({ axios, url, logger, method, data, configurationUtilities, headers, sslOverrides, proxyOverrides, timeout, connectorUsageCollector, keepAlive, ...config }: {
    axios: AxiosInstance;
    url: string;
    logger: Logger;
    method?: Method;
    data?: T;
    configurationUtilities: ActionsConfigurationUtilities;
    headers?: Record<string, AxiosHeaderValue>;
    timeout?: number;
    sslOverrides?: SSLSettings;
    proxyOverrides?: ProxySettings;
    connectorUsageCollector?: ConnectorUsageCollector;
    /**
     *  keep-alive is only supported for https connections or proxied http connections
     *  It will be ignored for non-proxied http connections, this issue is tracked in https://github.com/elastic/kibana/issues/252991
     **/
    keepAlive?: boolean;
} & AxiosRequestConfig) => Promise<AxiosResponse>;
export declare const patch: <T = unknown>({ axios, url, data, logger, configurationUtilities, connectorUsageCollector, }: {
    axios: AxiosInstance;
    url: string;
    data: T;
    logger: Logger;
    configurationUtilities: ActionsConfigurationUtilities;
    connectorUsageCollector?: ConnectorUsageCollector;
}) => Promise<AxiosResponse>;
export declare const addTimeZoneToDate: (date: string, timezone?: string) => string;
export declare const getErrorMessage: (connector: string, msg: string) => string;
export declare const throwIfResponseIsNotValid: ({ res, requiredAttributesToBeInTheResponse, }: {
    res: AxiosResponse;
    requiredAttributesToBeInTheResponse?: string[];
}) => void;
export declare const createAxiosResponse: (res: Partial<AxiosResponse>) => AxiosResponse;
export interface AxiosErrorWithRetry {
    config: InternalAxiosRequestConfig & {
        _retry?: boolean;
    };
    response?: {
        status: number;
    };
    message: string;
}
