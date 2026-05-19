import React from 'react';
export interface CapabilityCardProps {
    count: number;
    title: string;
    description: string;
    emptyDescription: string;
    image?: string;
    href?: string;
    onClick?: () => void;
    isCountLoading?: boolean;
    dataTestSubj?: string;
}
export declare const CapabilityCard: React.FC<CapabilityCardProps>;
