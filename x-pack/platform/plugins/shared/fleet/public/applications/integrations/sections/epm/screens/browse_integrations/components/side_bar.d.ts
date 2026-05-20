import type { IntegrationCategory } from '@kbn/custom-integrations-plugin/common';
import React from 'react';
export interface CategoryFacet {
    count: number;
    id: string;
    title: string;
    parent_id?: string;
    parent_title?: string;
}
export declare const UPDATES_AVAILABLE = "updates_available";
export declare const INSTALL_FAILED = "install_failed";
export declare const UPDATE_FAILED = "update_failed";
export type ExtendedIntegrationCategory = IntegrationCategory | typeof UPDATES_AVAILABLE | '';
export declare const ALL_CATEGORY: {
    id: string;
    title: string;
};
export declare const ALL_INSTALLED_CATEGORY: {
    id: string;
    title: string;
};
export declare const UPDATES_AVAILABLE_CATEGORY: {
    id: string;
    title: string;
};
export declare const INSTALL_FAILED_CATEGORY: {
    id: string;
    title: string;
};
export declare const UPDATE_FAILED_CATEGORY: {
    id: string;
    title: string;
};
export interface Props {
    isLoading?: boolean;
    categories: CategoryFacet[];
    selectedCategory: string;
    onCategoryChange: (category: CategoryFacet) => void;
}
export interface SidebarProps extends Props {
    CreateIntegrationCardButton?: React.ComponentType;
    hasCreatedIntegrations?: boolean;
    isLoadingCreatedIntegrations?: boolean;
    onManageIntegrationsClick?: (ev: React.MouseEvent<HTMLAnchorElement>) => void;
}
export declare const Sidebar: React.FC<SidebarProps>;
export declare function CategoryFacets({ isLoading, categories, selectedCategory, onCategoryChange, }: Props): React.JSX.Element;
