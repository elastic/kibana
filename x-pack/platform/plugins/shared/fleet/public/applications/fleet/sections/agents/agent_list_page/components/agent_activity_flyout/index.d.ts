import React from 'react';
export declare const AgentActivityFlyout: React.FunctionComponent<{
    onClose: () => void;
    onAbortSuccess: () => void;
    refreshAgentActivity: boolean;
    setSearch: (search: string) => void;
    setSelectedStatus: (status: string[]) => void;
    openManageAutoUpgradeModal: (policyId: string) => void;
}>;
