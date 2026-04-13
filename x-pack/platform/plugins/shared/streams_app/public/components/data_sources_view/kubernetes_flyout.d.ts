import React from 'react';
interface KubernetesFlyoutProps {
    logoUrl: string;
    onClose: () => void;
    isChild?: boolean;
    historyKey?: symbol;
    hideCloseButton?: boolean;
    ownFocus?: boolean;
}
export declare const KubernetesFlyout: React.FC<KubernetesFlyoutProps>;
export {};
