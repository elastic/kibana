/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { CaseAiWorkspaceProps } from '@kbn/agent-builder-browser';
import type { AgentBuilderInternalService } from '../services';
import type { AgentBuilderStartDependencies } from '../types';
import { AgentBuilderServicesContext } from '../application/context/agent_builder_services_context';
import { CaseAiWorkspaceView } from './components/case_ai_workspace_view';

export interface CaseAiWorkspaceInternalProps extends CaseAiWorkspaceProps {
  services: AgentBuilderInternalService;
  coreStart: CoreStart;
}

export const CaseAiWorkspaceInternal: React.FC<CaseAiWorkspaceInternalProps> = ({
  services,
  coreStart,
  ...caseProps
}) => {
  const queryClient = useMemo(() => new QueryClient(), []);

  const kibanaServices = useMemo(
    () => ({
      ...coreStart,
      plugins: services.startDependencies as AgentBuilderStartDependencies,
    }),
    [coreStart, services.startDependencies]
  );

  return (
    <KibanaContextProvider services={kibanaServices}>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <AgentBuilderServicesContext.Provider value={services}>
            <CaseAiWorkspaceView {...caseProps} services={services} coreStart={coreStart} />
          </AgentBuilderServicesContext.Provider>
        </QueryClientProvider>
      </I18nProvider>
    </KibanaContextProvider>
  );
};
