import React from 'react';
export declare const EmptyPrompt: React.FunctionComponent<{
    hasFleetAddAgentsPrivileges: boolean;
    setEnrollmentFlyoutState: (value: React.SetStateAction<{
        isOpen: boolean;
        selectedPolicyId?: string | undefined;
    }>) => void;
}>;
