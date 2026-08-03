import React from 'react';
export interface ClosingReasonPanelProps {
    onSubmit: (reason?: string) => void;
    /** Optional label override for the confirm button */
    buttonLabel?: string;
}
export declare const ClosingReasonPanel: React.NamedExoticComponent<ClosingReasonPanelProps>;
