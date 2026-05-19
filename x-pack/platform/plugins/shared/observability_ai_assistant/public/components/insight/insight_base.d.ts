import React from 'react';
export interface InsightBaseProps {
    title: string;
    description?: string;
    controls?: React.ReactNode;
    debug?: boolean;
    actions?: Array<{
        id: string;
        label: string;
        icon?: string;
        handler: () => void;
    }>;
    onToggle: (isOpen: boolean) => void;
    children: React.ReactNode;
    isOpen: boolean;
    loading?: boolean;
    dataTestSubj?: string;
}
export declare function InsightBase({ title, description, controls, children, actions, onToggle, loading, isOpen, dataTestSubj, }: InsightBaseProps): React.JSX.Element;
