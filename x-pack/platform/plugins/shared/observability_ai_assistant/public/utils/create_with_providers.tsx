/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantService,
} from '../types';
import { ObservabilityAIAssistantProvider } from '../context/observability_ai_assistant_provider';

export type WithProviders = <P extends {}, R = {}>(
  Component: React.ComponentType<P>
) => React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<R>>;

export function createWithProviders({
  service,
  kibanaContextServices,
}: {
  service: ObservabilityAIAssistantService;
  kibanaContextServices: Omit<CoreStart, 'plugins'> & {
    plugins: { start: ObservabilityAIAssistantPluginStartDependencies };
  };
}) {
  const withProviders = <P extends {}, R = {}>(Component: React.ComponentType<P>) =>
    React.forwardRef((props: P, ref: React.Ref<R>) => (
      <KibanaContextProvider services={kibanaContextServices}>
        <ObservabilityAIAssistantProvider value={service}>
          <Component {...props} ref={ref} />
        </ObservabilityAIAssistantProvider>
      </KibanaContextProvider>
    ));

  return withProviders;
}
