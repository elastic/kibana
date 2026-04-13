import React from 'react';
interface AwsFlyoutProps {
    logoUrl: string;
    onClose: () => void;
    onSeeMyData?: () => void;
    isChild?: boolean;
    historyKey?: symbol;
    hideCloseButton?: boolean;
    ownFocus?: boolean;
}
export declare const AwsFlyout: React.FC<AwsFlyoutProps>;
export {};
