import React from 'react';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
export interface AlertEpisodeTagsFlyoutProps {
    onClose: () => void;
    currentTags: string[];
    services: {
        expressions: ExpressionsStart;
        spaces: SpacesPluginStart;
    };
    /** Called with the selected tags on save. The flyout closes immediately after. */
    onSave: (tags: string[]) => void;
    /**
     * When true, render only the body — `overlays.openFlyout` already provides
     * the surrounding `EuiFlyout` shell. Default `false` for inline usage.
     */
    embedded?: boolean;
}
export declare function AlertEpisodeTagsFlyout({ onClose, currentTags, services, onSave, embedded, }: AlertEpisodeTagsFlyoutProps): React.JSX.Element;
