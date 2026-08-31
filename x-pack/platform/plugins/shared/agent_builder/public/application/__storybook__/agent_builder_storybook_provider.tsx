/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { of } from 'rxjs';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { AgentBuilderServicesContext } from '../context/agent_builder_services_context';
import { ConversationContext } from '../context/conversation/conversation_context';
import { StreamingProvider } from '../context/streaming/streaming_context';
import type { AgentBuilderInternalService } from '../../services/types';
import type { StartServices } from '../hooks/use_kibana';
import type { ConversationActions } from '../context/conversation/use_conversation_actions';

const noOp = () => {};
const noOpAsync = () => Promise.resolve([] as never[]);

const kibanaServices = {
  analytics: {
    reportEvent: noOp,
  },
  notifications: {
    toasts: {
      add: noOp,
      addSuccess: noOp,
      addWarning: noOp,
      addDanger: noOp,
      addError: noOp,
      remove: noOp,
      get$: () => of([]),
    },
  },
  uiSettings: {
    get: () => undefined,
    get$: () => of(undefined),
    getAll: () => ({}),
    overrideLocalDefault: noOp,
    isCustom: () => false,
    isOverridden: () => false,
    isDeclared: () => false,
    isDefault: () => true,
    set: () => Promise.resolve(true),
    remove: () => Promise.resolve(true),
  },
  http: {
    get: noOpAsync,
    post: noOpAsync,
    put: noOpAsync,
    delete: noOpAsync,
    patch: noOpAsync,
    fetch: noOpAsync,
    basePath: { get: () => '', prepend: (p: string) => p, remove: (p: string) => p },
  },
  settings: {
    client: {
      get: () => undefined,
      get$: () => of(undefined),
      set: () => Promise.resolve(true),
      getAll: () => ({}),
    },
  },
  application: {
    capabilities: { management: {}, catalogue: {}, actions: { show: true } },
    currentAppId$: of('agentBuilder'),
    currentLocation$: of({ id: 'agentBuilder', state: {} }),
    navigateToApp: () => Promise.resolve(),
    getUrlForApp: () => '/',
    navigateToUrl: () => Promise.resolve(),
  },
  appParams: { history: {} },
  plugins: {},
} as unknown as StartServices;

const agentBuilderServices = {
  agentService: {
    list: () =>
      Promise.resolve([
        { id: agentBuilderDefaultAgentId, type: 'chat', name: 'Elastic AI Agent', description: '' },
      ]),
    get: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
  },
  attachmentsService: { getAttachmentUiDefinition: () => undefined },
  renderersService: {},
  chatService: {},
  conversationsService: {},
  docLinksService: {},
  navigationService: {},
  toolsService: {},
  skillsService: {},
  smlService: {},
  pluginsService: {},
  oauthClientsService: {},
  startDependencies: {},
  accessChecker: {},
  eventsService: { track: noOp },
  isEarsEnabled: false,
  isEarsExperimentalEnabled: false,
  openSidebarConversation: () => ({}),
} as unknown as AgentBuilderInternalService;

const defaultQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

export interface AgentBuilderStorybookProviderProps {
  children: React.ReactNode;
  /** Provide a stable conversationId for stories that exercise telemetry/context reads. */
  conversationId?: string;
  agentId?: string;
}

export const AgentBuilderStorybookProvider = ({
  children,
  conversationId,
  agentId = agentBuilderDefaultAgentId,
}: AgentBuilderStorybookProviderProps) => (
  <QueryClientProvider client={defaultQueryClient}>
    <KibanaContextProvider services={kibanaServices}>
      <AgentBuilderServicesContext.Provider value={agentBuilderServices}>
        <StreamingProvider>
          <ConversationContext.Provider
            value={{
              isEmbeddedContext: false,
              agentId,
              conversationId,
              conversationActions: {} as ConversationActions,
            }}
          >
            {children}
          </ConversationContext.Provider>
        </StreamingProvider>
      </AgentBuilderServicesContext.Provider>
    </KibanaContextProvider>
  </QueryClientProvider>
);
