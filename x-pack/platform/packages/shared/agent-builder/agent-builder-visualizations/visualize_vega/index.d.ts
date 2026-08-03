import React from 'react';
import type { TimeRange } from '@kbn/es-query';
import { type InlineRenderCallbacks } from '@kbn/agent-builder-browser/attachments';
import type { VisualizationServices } from '../services';
/**
 * Render a custom Vega/Vega-Lite spec inline as a by-value visualize
 * embeddable — the same renderer Kibana uses for Vega panels on dashboards.
 * The spec is passed by value, so nothing is persisted as a saved object until
 * the user explicitly saves it to a dashboard.
 *
 * The time range is published from the parent API (rather than baked into the
 * child's serialized `time_range`) so the unified SearchBar date picker can
 * re-drive the embeddable's fetch — a local child time range would otherwise
 * take precedence over the picker.
 */
export declare function VisualizeVega({ services, visualization, timeRange, registerActionButtons, }: {
    services: VisualizationServices;
    visualization: Record<string, unknown>;
    timeRange?: TimeRange;
    registerActionButtons?: InlineRenderCallbacks['registerActionButtons'];
}): React.JSX.Element;
