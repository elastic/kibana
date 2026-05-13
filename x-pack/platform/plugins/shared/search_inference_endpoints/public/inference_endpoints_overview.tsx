/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';

import { App } from './components/app';
import { useKibana } from './hooks/use_kibana';
import { InferenceEndpointsProvider } from './providers/inference_endpoints_provider';

export const InferenceEndpointsOverview: React.FC = () => {
  const {
    services: { console: consolePlugin, setBreadcrumbs, chrome },
  } = useKibana();

  useEffect(() => {
    // Only set breadcrumbs in classic chrome. In project chrome (serverless or solution spaces),
    // the navigation tree provides the breadcrumb path automatically.
    if (chrome.getChromeStyle() === 'classic') {
      setBreadcrumbs([
        {
          text: i18n.translate('xpack.searchInferenceEndpoints.breadcrumbs.inferenceEndpoints', {
            defaultMessage: 'External Inference',
          }),
        },
      ]);
    }
  }, [setBreadcrumbs, chrome]);

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  return (
    <InferenceEndpointsProvider>
      <KibanaPageTemplate
        offset={0}
        restrictWidth={false}
        grow={false}
        data-test-subj="inferenceEndpointsPage"
      >
        <App />
        {embeddableConsole}
      </KibanaPageTemplate>
    </InferenceEndpointsProvider>
  );
};
