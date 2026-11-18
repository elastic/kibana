/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';
import type { WebCrawlerConfig, WebCrawlerServices } from './types';

const ServicesContext = createContext<WebCrawlerServices | null>(null);
const ConfigContext = createContext<WebCrawlerConfig | null>(null);

interface WebCrawlerProviderProps {
  services: WebCrawlerServices;
  config: WebCrawlerConfig;
}

export const WebCrawlerProvider = ({
  services,
  config,
  children,
}: PropsWithChildren<WebCrawlerProviderProps>) => (
  <ServicesContext.Provider value={services}>
    <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
  </ServicesContext.Provider>
);

/** Kibana services captured when this plugin started, rather than from the host's context. */
export const useWebCrawlerServices = (): WebCrawlerServices => {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error('useWebCrawlerServices must be called inside a <WebCrawlerProvider>');
  }
  return services;
};

/** What the hosting plugin passed to the component it rendered. */
export const useWebCrawlerConfig = (): WebCrawlerConfig => {
  const config = useContext(ConfigContext);
  if (!config) {
    throw new Error('useWebCrawlerConfig must be called inside a <WebCrawlerProvider>');
  }
  return config;
};

/** Namespaces a telemetry id for an element the crawler owns under the host's prefix. */
export const useTelemetryId = (): ((suffix: string) => string) => {
  const { telemetryPrefix } = useWebCrawlerConfig();
  return (suffix: string) => `${telemetryPrefix}-${suffix}`;
};

/** Namespaces a localStorage key under the host's prefix. */
export const useStorageKey = (): ((suffix: string) => string) => {
  const { storageKeyPrefix } = useWebCrawlerConfig();
  return (suffix: string) => `${storageKeyPrefix}.${suffix}`;
};
