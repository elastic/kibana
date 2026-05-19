import React from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
export interface AlertEpisodeTagsFlyoutProps {
    onClose: () => void;
    groupHash: string;
    currentTags: string[];
    http: HttpStart;
    services: {
        expressions: ExpressionsStart;
    };
    /**
     * When provided, called with the selected tags on save instead of the
     * internal single-row mutation. The flyout closes immediately after calling.
     */
    onSave?: (tags: string[]) => void;
    /**
     * When true, render only the body — `overlays.openFlyout` already provides
     * the surrounding `EuiFlyout` shell. Default `false` for inline usage.
     */
    embedded?: boolean;
}
export declare function AlertEpisodeTagsFlyout({ onClose, groupHash, currentTags, http, services, onSave, embedded, }: AlertEpisodeTagsFlyoutProps): React.JSX.Element;
