import React from 'react';
export declare function Card({ isDisabled, isSelected, title, titleTooltipContent, kpiValue, footer, onClick, isLoading, dataTestSubjTitle, }: {
    isDisabled?: boolean;
    isSelected?: boolean;
    title: string;
    titleTooltipContent?: React.ReactNode;
    kpiValue: string;
    footer: React.ReactNode;
    onClick?: () => void;
    isLoading?: boolean;
    dataTestSubjTitle?: string;
}): React.JSX.Element;
