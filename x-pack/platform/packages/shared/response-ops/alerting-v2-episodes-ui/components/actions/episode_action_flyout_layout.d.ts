import type { ReactNode } from 'react';
import React from 'react';
export interface EpisodeActionFlyoutProps {
    onClose: () => void;
    dataTestSubj: string;
    ariaLabelledBy: string;
    titleId: string;
    title: ReactNode;
    titleDataTestSubj?: string;
    subtitle?: ReactNode;
    children: ReactNode;
    footer: ReactNode;
    /**
     * When true, render only the header/body/footer fragment without the outer
     * `EuiFlyout`. Use this when mounting through `overlays.openFlyout`, which
     * already provides the flyout shell — wrapping again would nest two flyouts.
     */
    embedded?: boolean;
}
export declare function EpisodeActionFlyout({ onClose, dataTestSubj, ariaLabelledBy, titleId, title, titleDataTestSubj, subtitle, children, footer, embedded, }: EpisodeActionFlyoutProps): React.JSX.Element;
export interface EpisodeActionFlyoutFooterProps {
    onClose: () => void;
    onPrimaryClick: () => void;
    cancelLabel: string;
    primaryLabel: string;
    cancelTestSubj: string;
    primaryTestSubj: string;
    isPrimaryLoading: boolean;
    isPrimaryDisabled: boolean;
    isCancelDisabled?: boolean;
}
export declare function EpisodeActionFlyoutFooter({ onClose, onPrimaryClick, cancelLabel, primaryLabel, cancelTestSubj, primaryTestSubj, isPrimaryLoading, isPrimaryDisabled, isCancelDisabled, }: EpisodeActionFlyoutFooterProps): React.JSX.Element;
