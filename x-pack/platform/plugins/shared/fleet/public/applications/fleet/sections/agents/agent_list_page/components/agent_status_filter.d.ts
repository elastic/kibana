import React from 'react';
export declare const AgentStatusFilter: React.FC<{
    selectedStatus: string[];
    onSelectedStatusChange: (status: string[]) => void;
    disabled?: boolean;
    totalInactiveAgents: number;
    isOpenByDefault?: boolean;
}>;
