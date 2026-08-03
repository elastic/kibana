import React from 'react';
import type { TimeRange } from '@kbn/es-query';
import type { InlineRenderCallbacks } from '@kbn/agent-builder-browser/attachments';
import type { VisualizationServices } from './services';
export interface InlineVisualizationProps {
    services: VisualizationServices;
    /** Which renderer to use. Anything other than `'vega'` renders via Lens. */
    renderer?: 'lens' | 'vega';
    /** Renderer-specific payload: a Lens config, or a Vega spec under `spec`. */
    visualization: Record<string, unknown>;
    timeRange?: TimeRange;
    registerActionButtons?: InlineRenderCallbacks['registerActionButtons'];
}
/**
 * Renders a stored visualization payload with the renderer selected by
 * `renderer`, lazily loading the underlying component and sharing the
 * `Suspense` loading boilerplate between renderers.
 */
export declare const InlineVisualization: ({ services, renderer, visualization, timeRange, registerActionButtons, }: InlineVisualizationProps) => React.JSX.Element;
