/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { CoreStart } from '@kbn/core/public';
import { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import { withSuspense } from '@kbn/presentation-util-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import { LazyDebugRenderComponent } from './components';

const JSON = 'JSON';

const Debug = withSuspense(LazyDebugRenderComponent);

const strings = {
  getDisplayName: () =>
    i18n.translate('xpack.canvas.renderer.debug.displayName', {
      defaultMessage: 'Debug',
    }),
  getHelpDescription: () =>
    i18n.translate('xpack.canvas.renderer.debug.helpDescription', {
      defaultMessage: 'Render debug output as formatted {JSON}',
      values: {
        JSON,
      },
    }),
};

export const getDebugRenderer = (core: CoreStart) => (): ExpressionRenderDefinition<any> => ({
  name: 'debug',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render(domNode, config, handlers) {
    handlers.onDestroy(() => unmountComponentAtNode(domNode));
    render(
      <KibanaErrorBoundaryProvider analytics={undefined}>
        <KibanaErrorBoundary>
          <KibanaThemeProvider {...core}>
            <Debug parentNode={domNode} payload={config} onLoaded={handlers.done} />
          </KibanaThemeProvider>
        </KibanaErrorBoundary>
      </KibanaErrorBoundaryProvider>,
      domNode
    );
  },
});

export const debugRendererFactory = (core: CoreStart) => getDebugRenderer(core);
