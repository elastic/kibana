import React from 'react';
export interface EditEpisodeAssigneeFlyoutProps {
    /** Required for inline (single-row) usage that posts the assign action itself. */
    episodeId?: string;
    /** Required for inline (single-row) usage that posts the assign action itself. */
    groupHash?: string;
    lastAssigneeUid: string | null | undefined;
    onClose: () => void;
    /**
     * When provided, called with the selected uid (or null) instead of posting the
     * assign action. The bulk path uses this to gather the selection and post one
     * action per selected episode itself. The flyout closes immediately after calling.
     */
    onSave?: (uid: string | null) => void;
    /**
     * Number of episodes the action will apply to. Drives plural copy in the
     * empty list message and, when > 1, keeps Save enabled even if the selection
     * is unchanged from the (empty) "current" state — so the bulk path can clear
     * assignees across multiple rows. Defaults to 1 (single-row usage).
     */
    episodeCount?: number;
    /**
     * When true, render only the body — `overlays.openFlyout` already provides
     * the surrounding `EuiFlyout` shell. Default `false` for inline usage.
     */
    embedded?: boolean;
}
export declare function EditEpisodeAssigneeFlyout({ episodeId, groupHash, lastAssigneeUid, onClose, onSave, embedded, episodeCount, }: EditEpisodeAssigneeFlyoutProps): React.JSX.Element;
