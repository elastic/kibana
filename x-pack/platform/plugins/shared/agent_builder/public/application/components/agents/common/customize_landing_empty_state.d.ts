import React from 'react';
export interface CustomizeLandingEmptyStateProps {
    illustrationSrc: string;
    title: React.ReactNode;
    description: React.ReactNode;
    learnMoreHref: string;
    learnMoreLabel?: string;
    learnMoreSuffix?: React.ReactNode;
    learnMoreEbtProps?: Record<string, string>;
    primaryAction?: React.ReactNode;
    secondaryAction?: React.ReactNode;
    footer?: React.ReactNode;
    dataTestSubj?: string;
}
export declare const CustomizeLandingEmptyState: React.FC<CustomizeLandingEmptyStateProps>;
