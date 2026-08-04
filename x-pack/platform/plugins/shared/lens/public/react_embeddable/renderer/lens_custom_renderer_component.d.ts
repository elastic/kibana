import React from 'react';
import { type LensRendererProps } from '@kbn/lens-common';
/**
 * The aim of this component is to provide a wrapper for other plugins who want to
 * use a Lens component into their own page. This hides the embeddable parts of it
 * by wrapping it into a ReactEmbeddableRenderer component and exposing a custom API
 */
export declare function LensRenderer({ title, description, withDefaultActions, extraActions, showInspector, syncColors, syncCursor, syncTooltips, viewMode, id, query, filters, timeRange, disabledActions, searchSessionId, forceDSL, hidePanelTitles, lastReloadRequestTime, titleHighlight, ...props }: LensRendererProps): React.JSX.Element;
export type EmbeddableComponent = React.ComponentType<LensRendererProps>;
