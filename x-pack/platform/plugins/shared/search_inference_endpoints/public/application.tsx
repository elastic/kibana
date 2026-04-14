/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import type { AppPluginStartDependencies } from './types';

const renderMgmtApp = (
  core: CoreStart,
  services: AppPluginStartDependencies,
  element: HTMLElement,
  Component: React.ComponentType
) => {
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProvider services={{ ...core, ...services }}>
        <I18nProvider>
          <Router history={services.history}>
            <Component />
          </Router>
        </I18nProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

export const renderInferenceEndpointsMgmtApp = async (
  core: CoreStart,
  services: AppPluginStartDependencies,
  element: HTMLElement
) => {
  const { InferenceEndpointsOverview } = await import('./inference_endpoints_overview');
  return renderMgmtApp(core, services, element, InferenceEndpointsOverview);
};

export const renderSettingsMgmtApp = async (
  core: CoreStart,
  services: AppPluginStartDependencies,
  element: HTMLElement
) => {
  const { ModelSettingsOverview } = await import('./model_settings_overview');
  return renderMgmtApp(core, services, element, ModelSettingsOverview);
};
