import React from 'react';
export interface EditEpisodeAssigneeFlyoutProps {
    lastAssigneeUid: string | null | undefined;
    onClose: () => void;
    /** Called with the selected uid (or `null` to clear). The flyout closes immediately after. */
    onSave: (uid: string | null) => void;
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
export declare function EditEpisodeAssigneeFlyout({ lastAssigneeUid, onClose, onSave, embedded, episodeCount, }: EditEpisodeAssigneeFlyoutProps): React.JSX.Element;
