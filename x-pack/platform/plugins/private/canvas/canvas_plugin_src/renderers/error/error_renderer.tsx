/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { CoreStart } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
} from '@kbn/expressions-plugin/common';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import { withSuspense } from '@kbn/presentation-util-plugin/public';
import { ErrorRendererConfig } from './types';
import { LazyErrorRenderComponent } from './components';

const errorStrings = {
  getDisplayName: () =>
    i18n.translate('xpack.canvas.renderer.error.displayName', {
      defaultMessage: 'Error information',
    }),
  getHelpDescription: () =>
    i18n.translate('xpack.canvas.renderer.error.helpDescription', {
      defaultMessage: 'Render error data in a way that is helpful to users',
    }),
};

const ErrorComponent = withSuspense(LazyErrorRenderComponent);

export const getErrorRenderer =
  (core: CoreStart) => (): ExpressionRenderDefinition<ErrorRendererConfig> => ({
    name: 'error',
    displayName: errorStrings.getDisplayName(),
    help: errorStrings.getHelpDescription(),
    reuseDomNode: true,
    render: async (
      domNode: HTMLElement,
      config: ErrorRendererConfig,
      handlers: IInterpreterRenderHandlers
    ) => {
      handlers.onDestroy(() => {
        unmountComponentAtNode(domNode);
      });

      render(
        <KibanaErrorBoundaryProvider analytics={undefined}>
          <KibanaErrorBoundary>
            <KibanaThemeProvider {...core}>
              <I18nProvider>
                <ErrorComponent onLoaded={handlers.done} {...config} parentNode={domNode} />
              </I18nProvider>
            </KibanaThemeProvider>
          </KibanaErrorBoundary>
        </KibanaErrorBoundaryProvider>,
        domNode
      );
    },
  });

export const errorRendererFactory = (core: CoreStart) => getErrorRenderer(core);
