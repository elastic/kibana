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
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import { ImageRendererConfig } from './types';

const strings = {
  getDisplayName: () =>
    i18n.translate('xpack.canvas.renderer.image.displayName', {
      defaultMessage: 'Image',
    }),
  getHelpDescription: () =>
    i18n.translate('xpack.canvas.renderer.image.helpDescription', {
      defaultMessage: 'Render an image',
    }),
};

export const getImageRenderer =
  (core: CoreStart) => (): ExpressionRenderDefinition<ImageRendererConfig> => ({
    name: 'image',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    render: async (
      domNode: HTMLElement,
      config: ImageRendererConfig,
      handlers: IInterpreterRenderHandlers
    ) => {
      const { elasticLogo, isValidUrl } = await import('../../../public/lib');
      const dataurl = isValidUrl(config.dataurl ?? '') ? config.dataurl : elasticLogo;

      const style = {
        height: '100%',
        backgroundImage: `url(${dataurl})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
        backgroundSize: config.mode as string,
      };

      handlers.onDestroy(() => {
        unmountComponentAtNode(domNode);
      });

      render(
        <KibanaErrorBoundaryProvider analytics={undefined}>
          <KibanaErrorBoundary>
            <KibanaThemeProvider {...core}>
              <div style={style} />
            </KibanaThemeProvider>
          </KibanaErrorBoundary>
        </KibanaErrorBoundaryProvider>,
        domNode,
        () => handlers.done()
      );
    },
  });

export const imageRendererFactory = (core: CoreStart) => getImageRenderer(core);
