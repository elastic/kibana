/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { CoreStart } from '@kbn/core/public';
import {
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
} from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import { ProgressOutput } from './types';

const strings = {
  getDisplayName: () =>
    i18n.translate('xpack.canvas.renderer.progress.displayName', {
      defaultMessage: 'Progress',
    }),
  getHelpDescription: () =>
    i18n.translate('xpack.canvas.renderer.progress.helpDescription', {
      defaultMessage: 'Render a basic progress',
    }),
};

export type ProgressRendererConfig = ProgressOutput;

export const getProgressRenderer =
  (core: CoreStart) => (): ExpressionRenderDefinition<ProgressRendererConfig> => ({
    name: 'progress',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    render: async (
      domNode: HTMLElement,
      config: ProgressRendererConfig,
      handlers: IInterpreterRenderHandlers
    ) => {
      const { ProgressComponent } = await import('./components');
      handlers.onDestroy(() => {
        unmountComponentAtNode(domNode);
      });

      render(
        <KibanaErrorBoundaryProvider analytics={undefined}>
          <KibanaErrorBoundary>
            <KibanaThemeProvider {...core}>
              <I18nProvider>
                <ProgressComponent {...config} parentNode={domNode} onLoaded={handlers.done} />
              </I18nProvider>
            </KibanaThemeProvider>
          </KibanaErrorBoundary>
        </KibanaErrorBoundaryProvider>,
        domNode
      );
    },
  });

export const progressRendererFactory = (core: CoreStart) => getProgressRenderer(core);
