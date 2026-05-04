/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import type { AppPluginStartDependencies } from './types';
import { ElasticInferenceService } from './components/elastic_inference_service';
import { InferenceEndpointsProvider } from './providers/inference_endpoints_provider';
import { UsageTrackerContextProvider } from './contexts/usage_tracker_context';

export const renderElasticInferenceServiceApp = async (
  core: CoreStart,
  services: AppPluginStartDependencies,
  element: HTMLElement
) => {
  ReactDOM.render(
    core.rendering.addContext(
      <KibanaContextProvider services={{ ...core, ...services }}>
        <I18nProvider>
          <InferenceEndpointsProvider>
            <UsageTrackerContextProvider usageCollection={services.usageCollection}>
              <Router history={services.history}>
                <ElasticInferenceService />
              </Router>
            </UsageTrackerContextProvider>
          </InferenceEndpointsProvider>
        </I18nProvider>
      </KibanaContextProvider>
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
