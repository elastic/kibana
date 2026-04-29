/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiErrorBoundary } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { AgentBuilderNavControl } from './agent_builder_nav_control';
import type { AgentBuilderStartDependencies } from '../../types';
import type { AgentBuilderPluginStart } from '../../types';

interface AgentBuilderNavControlWithProviderDeps {
  coreStart: CoreStart;
  pluginsStart: AgentBuilderStartDependencies;
  agentBuilderService: AgentBuilderPluginStart;
}

export const AgentBuilderNavControlWithProvider = ({
  coreStart,
  pluginsStart,
  agentBuilderService,
}: AgentBuilderNavControlWithProviderDeps) => {
  return (
    <EuiErrorBoundary>
      <KibanaThemeProvider theme={coreStart.theme}>
        <KibanaContextProvider
          services={{
            ...coreStart,
            ...pluginsStart,
            agentBuilder: agentBuilderService,
          }}
        >
          <coreStart.i18n.Context>
            <AgentBuilderNavControl />
          </coreStart.i18n.Context>
        </KibanaContextProvider>
      </KibanaThemeProvider>
    </EuiErrorBoundary>
  );
};
