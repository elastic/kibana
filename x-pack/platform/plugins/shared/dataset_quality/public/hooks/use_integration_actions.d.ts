import type { Dashboard } from '../../common/api_types';
export declare const useIntegrationActions: () => {
    isOpen: boolean;
    handleCloseMenu: () => void;
    handleToggleMenu: () => void;
    getIntegrationOverviewLinkProps: (name: string, version: string) => {
        onClick: (event: Parameters<import("@kbn/router-utils/src/get_router_link_props").RouterLinkProps["onClick"]>[0]) => void;
        href: string | undefined;
    };
    getIndexManagementLinkProps: (params: {
        sectionId: string;
        appId: string;
    }) => {
        onClick: (event: Parameters<import("@kbn/router-utils/src/get_router_link_props").RouterLinkProps["onClick"]>[0]) => void;
        href: string | undefined;
    };
    getDashboardLinkProps: (dashboard: Dashboard) => {
        onClick: (event: Parameters<import("@kbn/router-utils/src/get_router_link_props").RouterLinkProps["onClick"]>[0]) => void;
        href: string | undefined;
    };
};
