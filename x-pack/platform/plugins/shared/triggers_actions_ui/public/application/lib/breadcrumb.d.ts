import type { ChromeStart } from '@kbn/core/public';
/**
 * Wraps chrome.setBreadcrumbs so that project-style (solution nav) breadcrumbs
 * are set alongside classic breadcrumbs. Without this, apps that are not part of
 * a solution's navigation tree only show the root deployment crumb.
 */
export declare const createSetBreadcrumbs: (setBreadcrumbs: ChromeStart["setBreadcrumbs"]) => ChromeStart["setBreadcrumbs"];
export declare const getAlertingSectionBreadcrumb: (type: string, returnHref?: boolean) => {
    text: string;
    href?: string;
};
/**
 * Get the rules breadcrumb with the appropriate href based on feature flag
 */
export declare const getRulesBreadcrumbWithHref: (getUrlForApp: (appId: string, options?: {
    path?: string;
}) => string) => {
    href: string;
    text: string;
};
