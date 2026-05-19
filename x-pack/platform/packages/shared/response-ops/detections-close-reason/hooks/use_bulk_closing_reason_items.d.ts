import type { ContentPanelConfig, RenderContentPanelProps } from '../types';
export declare const ALERT_CLOSING_REASON_PANEL_ID = "ALERT_CLOSING_REASON_PANEL_ID";
interface OnSubmitClosingReasonParams extends RenderContentPanelProps {
    /**
     * The reason the item(s) are being closed
     */
    reason?: string;
}
interface UseBulkClosingReasonItemsProps {
    /**
     * Whether the closing reason action should be shown
     */
    isEnabled?: boolean;
    /**
     * Called once the user confirms the closing reason
     */
    onSubmitCloseReason?: (params: OnSubmitClosingReasonParams) => void;
    /** Optional label override for the confirm button */
    buttonLabel?: string;
}
/**
 * Returns menu items and panels to be used in a EuiContextMenu component
 */
export declare const useBulkClosingReasonItems: ({ isEnabled, onSubmitCloseReason, buttonLabel, }?: UseBulkClosingReasonItemsProps) => {
    item: {
        key: string;
        'data-test-subj': string;
        label: string;
        panel: string;
    } | undefined;
    panels: ContentPanelConfig[];
    getPanels: ({ onSubmitCloseReason: onSubmitCloseReasonCb, }: {
        onSubmitCloseReason?: UseBulkClosingReasonItemsProps["onSubmitCloseReason"];
    }) => ContentPanelConfig[];
};
export {};
