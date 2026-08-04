import React from 'react';
export interface CapabilitiesSectionProps {
    skillsCount: number;
    pluginsCount: number;
    connectorsCount: number;
    toolsCount: number;
    skillsCountLoading: boolean;
    pluginsCountLoading: boolean;
    toolsCountLoading: boolean;
    enableElasticCapabilities: boolean;
    isExperimentalFeaturesEnabled: boolean;
    skillsHref: string;
    pluginsHref: string;
    connectorsHref: string;
    toolsHref: string;
    onNavigateToSkills: () => void;
    onNavigateToPlugins: () => void;
    onNavigateToConnectors: () => void;
    onNavigateToTools: () => void;
}
export declare const CapabilitiesSection: React.FC<CapabilitiesSectionProps>;
