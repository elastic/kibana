import React from 'react';
export default function DocumentTrends({ lastReloadTime, openAlertFlyout, displayActions: { displayCreateRuleButton, displayEditFailureStore }, }: {
    lastReloadTime: number;
    openAlertFlyout: () => void;
    displayActions: {
        displayCreateRuleButton: boolean;
        displayEditFailureStore: boolean;
    };
}): React.JSX.Element;
