/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import type { InlineRenderCallbacks } from '@kbn/agent-builder-browser/attachments';
import type { VisualizationRenderer } from '@kbn/agent-builder-visualizations-common';
import type { VisualizationServices } from './services';

const LazyVisualizeLens = React.lazy(() =>
  import('./visualize_lens').then((m) => ({ default: m.VisualizeLens }))
);

const LazyVisualizeVega = React.lazy(() =>
  import('./visualize_vega').then((m) => ({ default: m.VisualizeVega }))
);

const LazyVisualizeCustomContent = React.lazy(() =>
  import('./visualize_custom_content').then((m) => ({ default: m.VisualizeCustomContent }))
);

export interface InlineVisualizationProps {
  services: VisualizationServices;
  /** Absent on attachments predating the discriminator, which are Lens. */
  renderer?: VisualizationRenderer;
  /** A Lens config, a Vega spec under `spec`, or a custom content template under `template`. */
  visualization: Record<string, unknown>;
  /** ES|QL backing the payload. Only the custom content renderer fetches its own data. */
  esql?: string;
  timeRange?: TimeRange;
  registerActionButtons?: InlineRenderCallbacks['registerActionButtons'];
}

/**
 * Renders a stored visualization payload with the renderer selected by
 * `renderer`, lazily loading the underlying component and sharing the
 * `Suspense` loading boilerplate between renderers.
 */
export const InlineVisualization = ({
  services,
  renderer,
  visualization,
  esql,
  timeRange,
  registerActionButtons,
}: InlineVisualizationProps) => {
  const renderVisualization = () => {
    switch (renderer) {
      case 'vega':
        return (
          <LazyVisualizeVega
            services={services}
            visualization={visualization}
            timeRange={timeRange}
            registerActionButtons={registerActionButtons}
          />
        );
      case 'custom_content':
        return (
          <LazyVisualizeCustomContent
            services={services}
            visualization={visualization}
            esql={esql}
            timeRange={timeRange}
            registerActionButtons={registerActionButtons}
          />
        );
      default:
        return (
          <LazyVisualizeLens
            services={services}
            lensConfig={visualization}
            timeRange={timeRange}
            registerActionButtons={registerActionButtons}
          />
        );
    }
  };

  return <Suspense fallback={<EuiLoadingSpinner />}>{renderVisualization()}</Suspense>;
};
