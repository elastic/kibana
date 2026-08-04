import React from 'react';
import type { AlertEpisodeDetailsServices } from './types';
export interface AlertEpisodeMetadataSectionProps {
    episodeId: string;
    services: Pick<AlertEpisodeDetailsServices, 'data' | 'http' | 'spaces' | 'dataViews' | 'uiSettings' | 'unifiedDocViewer'>;
    /**
     * Pixels to subtract from the table's available-height calculation. Use this
     * when rendering inside a container that has a footer/sibling element below
     * the table (e.g. an `EuiFlyoutFooter`) — without this, the doc-viewer
     * table's internal scroll measures against `window.innerHeight` and would
     * extend past the visible area. Defaults to the unified-doc-viewer's own
     * `DEFAULT_MARGIN_BOTTOM` (16px).
     */
    decreaseAvailableHeightBy?: number;
}
export declare const AlertEpisodeMetadataSection: ({ episodeId, services, decreaseAvailableHeightBy, }: AlertEpisodeMetadataSectionProps) => React.JSX.Element | null;
