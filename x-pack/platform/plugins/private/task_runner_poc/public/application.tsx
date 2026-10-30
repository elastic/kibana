/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { EuiEmptyPrompt } from '@elastic/eui';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { PLUGIN_NAME } from '../common';

export const renderApp = (coreStart: CoreStart, { element }: AppMountParameters) => {
  coreStart.chrome.docTitle.change(PLUGIN_NAME);
  coreStart.chrome.setBreadcrumbs([{ text: PLUGIN_NAME }]);

  const root = createRoot(element);
  root.render(
    coreStart.rendering.addContext(
      <KibanaPageTemplate>
        <KibanaPageTemplate.Header pageTitle={PLUGIN_NAME} />
        <KibanaPageTemplate.Section>
          <EuiEmptyPrompt
            iconType="clock"
            title={<h2>Waiting for the updated contract</h2>}
            body={<p>The jobs, tasks, and output sections land once the service API is final.</p>}
          />
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    )
  );

  return () => {
    coreStart.chrome.docTitle.reset();
    root.unmount();
  };
};
