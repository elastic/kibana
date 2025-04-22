/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { CSSProperties } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { CoreStart } from '@kbn/core/public';
import {
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
  Style,
} from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';

export interface MetricRendererConfig {
  /** The text to display under the metric */
  label: string;
  /** Font settings for the label */
  labelFont: Style;
  /** Value of the metric to display */
  metric: string | number | null;
  /** Font settings for the metric */
  metricFont: Style;
  /** NumeralJS format string */
  metricFormat: string;
}

export interface NodeDimensions {
  width: number;
  height: number;
}

const strings = {
  getDisplayName: () =>
    i18n.translate('xpack.canvas.renderer.metric.displayName', {
      defaultMessage: 'Metric',
    }),
  getHelpDescription: () =>
    i18n.translate('xpack.canvas.renderer.metric.helpDescription', {
      defaultMessage: 'Render a number over a label',
    }),
};

export const getMetricRenderer =
  (core: CoreStart) => (): ExpressionRenderDefinition<MetricRendererConfig> => ({
    name: 'metric',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    render: async (
      domNode: HTMLElement,
      config: MetricRendererConfig,
      handlers: IInterpreterRenderHandlers
    ) => {
      const { MetricComponent } = await import('./metric_component');
      handlers.onDestroy(() => {
        unmountComponentAtNode(domNode);
      });

      render(
        <KibanaErrorBoundaryProvider analytics={undefined}>
          <KibanaErrorBoundary>
            <KibanaThemeProvider {...core}>
              <MetricComponent
                label={config.label}
                labelFont={config.labelFont ? (config.labelFont.spec as CSSProperties) : {}}
                metric={config.metric}
                metricFont={config.metricFont ? (config.metricFont.spec as CSSProperties) : {}}
                metricFormat={config.metricFormat}
              />
            </KibanaThemeProvider>
          </KibanaErrorBoundary>
        </KibanaErrorBoundaryProvider>,
        domNode,
        () => handlers.done()
      );
    },
  });

export const metricRendererFactory = (core: CoreStart) => getMetricRenderer(core);
