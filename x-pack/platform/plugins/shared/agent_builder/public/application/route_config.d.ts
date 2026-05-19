import React from 'react';
export type SidebarView = 'conversation' | 'manage';
export interface FeatureFlags {
    experimental: boolean;
}
export interface Capabilities {
    isUIAMEnabled: boolean;
}
export interface RouteAccessConfig {
    featureFlags: FeatureFlags;
    capabilities: Capabilities;
}
export interface RouteDefinition {
    path: string;
    viewId: string;
    element: React.ReactNode;
    sidebarView: SidebarView;
    isExperimental?: boolean;
    requiresUIAM?: boolean;
    navLabel?: string;
    navIcon?: string;
}
export declare const agentRoutes: RouteDefinition[];
export declare const manageRoutes: RouteDefinition[];
export declare const allRoutes: RouteDefinition[];
export declare const getSidebarViewForRoute: (pathname: string) => SidebarView;
export declare const getViewIdForPathname: (pathname: string, enabledRoutes: RouteDefinition[]) => string | undefined;
export declare const getAgentIdFromPath: (pathname: string) => string | undefined;
export declare const getConversationIdFromPath: (pathname: string) => string | undefined;
export declare const getPathWithSwitchedAgent: (pathname: string, newAgentId: string) => string;
export interface SidebarNavItem {
    label: string;
    path: string;
    icon?: string;
}
export declare const getEnabledRoutes: (config: RouteAccessConfig) => RouteDefinition[];
export declare const getAgentSettingsNavItems: (agentId: string, config: RouteAccessConfig) => SidebarNavItem[];
export declare const getManageNavItems: (config: RouteAccessConfig) => SidebarNavItem[];
