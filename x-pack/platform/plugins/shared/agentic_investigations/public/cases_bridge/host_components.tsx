/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import type { ReactNode } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { EscalationModalRenderProps } from '@kbn/agentic-investigations-common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClientProvider } from '@kbn/react-query';
import { ConnectedCaseBridgeProvider } from './connected_case_bridge_provider';
import { getBridgeQueryClient } from './query_client';
import type { AgenticInvestigationsPublicStartDependencies } from '../types';

let hostServices: (CoreStart & AgenticInvestigationsPublicStartDependencies) | undefined;

/** Set from this plugin's start, so components a solution renders use this plugin's services. */
export const setCaseBridgeHostServices = (
  services: CoreStart & AgenticInvestigationsPublicStartDependencies
) => {
  hostServices = services;
};

/**
 * A solution's page or Agent Builder's flyout renders these outside this plugin's React tree, so
 * they bring this plugin's services and the bridge's query cache. The provider is not lazy: a lazy
 * wrapper would render the page once without it and then remount everything under it.
 */
const BridgeProviders: React.FC<{ children: ReactNode }> = ({ children }) => (
  <KibanaContextProvider services={hostServices}>
    <QueryClientProvider client={getBridgeQueryClient()}>{children}</QueryClientProvider>
  </KibanaContextProvider>
);

const LazyModal = React.lazy(async () => {
  const { OpenCaseModal } = await import('./open_case_modal/open_case_modal');
  const Wrapped: React.FC<EscalationModalRenderProps> = (props) => (
    <BridgeProviders>
      <OpenCaseModal {...props} />
    </BridgeProviders>
  );
  return { default: Wrapped };
});

/**
 * For a solution's queue page: gives its cards and menus the case actions and badges, resolving
 * each card's case from its conversation id.
 */
export const CaseBridgeForQueue: React.FC<{ conversationIds: string[]; children: ReactNode }> = ({
  conversationIds,
  children,
}) => (
  <BridgeProviders>
    <ConnectedCaseBridgeProvider conversationIds={conversationIds}>
      {children}
    </ConnectedCaseBridgeProvider>
  </BridgeProviders>
);

/** The same, for one investigation whose case is known (the details flyout). */
export const CaseBridgeForInvestigation: React.FC<{ caseIds: string[]; children: ReactNode }> = ({
  caseIds,
  children,
}) => (
  <BridgeProviders>
    <ConnectedCaseBridgeProvider caseIds={caseIds}>{children}</ConnectedCaseBridgeProvider>
  </BridgeProviders>
);

/** The Open a case modal, for a solution's queue page. */
export const OpenCaseModalForQueue: React.FC<EscalationModalRenderProps> = (props) => (
  <Suspense fallback={null}>
    <LazyModal {...props} />
  </Suspense>
);
