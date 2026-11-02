/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  ElasticsearchHomePageProps,
  ElasticsearchHomeServices,
  HomeIdeSetup,
  ResolvedHomeConfig,
} from './types';

const DEFAULT_DOCS_LINK_LABEL = i18n.translate(
  'xpack.elasticsearchHome.home.docsLink.defaultLabel',
  { defaultMessage: 'Learn more about Elasticsearch' }
);

const DEFAULT_IDE_SETUP: HomeIdeSetup = {
  prompt: [
    'Install the Elastic skills:',
    '`npx skills add elastic/agent-skills`',
    '',
    'Help me get started with Elasticsearch',
  ].join('\n'),
  agentInitialMessage: '/elasticsearch-onboarding',
  agentSessionTag: 'elasticsearch-home',
};

const ServicesContext = createContext<ElasticsearchHomeServices | null>(null);
const ConfigContext = createContext<ResolvedHomeConfig | null>(null);

interface ElasticsearchHomeProviderProps {
  services: ElasticsearchHomeServices;
  config: ElasticsearchHomePageProps;
}

export const ElasticsearchHomeProvider = ({
  services,
  config,
  children,
}: PropsWithChildren<ElasticsearchHomeProviderProps>) => {
  const { docLinks } = services;
  const defaultDocsLink = useMemo(
    () => ({ href: docLinks.links.elasticsearch.gettingStarted, label: DEFAULT_DOCS_LINK_LABEL }),
    [docLinks]
  );

  const resolvedConfig: ResolvedHomeConfig = useMemo(
    () => ({
      ...config,
      docsLink: config.docsLink ?? defaultDocsLink,
      ideSetup: config.ideSetup ?? DEFAULT_IDE_SETUP,
    }),
    [config, defaultDocsLink]
  );

  return (
    <ServicesContext.Provider value={services}>
      <ConfigContext.Provider value={resolvedConfig}>{children}</ConfigContext.Provider>
    </ServicesContext.Provider>
  );
};

/** Kibana services captured when the hosting plugin started, rather than from the host's context. */
export const useHomeServices = (): ElasticsearchHomeServices => {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error('useHomeServices must be called inside an <ElasticsearchHomeProvider>');
  }
  return services;
};

/** The host-supplied product identity for this page, with defaults applied. */
export const useHomeConfig = (): ResolvedHomeConfig => {
  const config = useContext(ConfigContext);
  if (!config) {
    throw new Error('useHomeConfig must be called inside an <ElasticsearchHomeProvider>');
  }
  return config;
};

/** Namespaces a telemetry id for an element this page owns under the host's prefix. */
export const useTelemetryId = (): ((suffix: string) => string) => {
  const { telemetryPrefix } = useHomeConfig();
  return (suffix: string) => `${telemetryPrefix}-${suffix}`;
};

/** Namespaces a localStorage key under the host's prefix. */
export const useStorageKey = (): ((suffix: string) => string) => {
  const { storageKeyPrefix } = useHomeConfig();
  return (suffix: string) => `${storageKeyPrefix}.${suffix}`;
};
