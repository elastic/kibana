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
import { RepeatImageRendererConfig } from './types';

const strings = {
  getDisplayName: () =>
    i18n.translate('xpack.canvas.renderer.repeatImage.displayName', {
      defaultMessage: 'RepeatImage',
    }),
  getHelpDescription: () =>
    i18n.translate('xpack.canvas.renderer.repeatImage.helpDescription', {
      defaultMessage: 'Render a basic repeatImage',
    }),
};

export const getRepeatImageRenderer =
  (core: CoreStart) => (): ExpressionRenderDefinition<RepeatImageRendererConfig> => ({
    name: 'repeatImage',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    render: async (
      domNode: HTMLElement,
      config: RepeatImageRendererConfig,
      handlers: IInterpreterRenderHandlers
    ) => {
      const [{ elasticOutline, isValidUrl }, { RepeatImageComponent }] = await Promise.all([
        import('../../../public/lib'),
        import('./repeat_image_component'),
      ]);
      const settings = {
        ...config,
        image: isValidUrl(config.image) ? config.image : elasticOutline,
        emptyImage: config.emptyImage || '',
      };

      handlers.onDestroy(() => {
        unmountComponentAtNode(domNode);
      });

      render(
        <KibanaErrorBoundaryProvider analytics={undefined}>
          <KibanaErrorBoundary>
            <KibanaThemeProvider {...core}>
              <I18nProvider>
                <RepeatImageComponent onLoaded={handlers.done} {...settings} parentNode={domNode} />
              </I18nProvider>
            </KibanaThemeProvider>
          </KibanaErrorBoundary>
        </KibanaErrorBoundaryProvider>,
        domNode
      );
    },
  });

export const repeatImageRendererFactory = (core: CoreStart) => getRepeatImageRenderer(core);
