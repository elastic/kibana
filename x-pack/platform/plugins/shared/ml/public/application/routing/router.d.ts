import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { RouteProps } from 'react-router-dom';
import { type Location } from 'history';
import type { AppMountParameters, ChromeStart, ChromeBreadcrumb } from '@kbn/core/public';
import type { MlPages } from '../../locator';
import { type RouteResolverContext } from './use_resolver';
interface MlRouteProps extends RouteProps {
    location: Location;
}
export interface MlRoute {
    /**
     * Route ID.
     * Used for tab IDs
     */
    id?: string;
    path: string;
    /**
     * Route name.
     * Used for side nav items and page titles.
     */
    title?: string;
    render(props: MlRouteProps, deps: PageDependencies): JSX.Element;
    breadcrumbs: ChromeBreadcrumb[];
    /**
     * Indicated if page contains a global date picker.
     */
    enableDatePicker?: boolean;
    'data-test-subj'?: string;
    actionMenu?: React.ReactNode;
    disabled?: boolean;
}
export interface PageProps {
    location: Location;
    deps: PageDependencies;
}
export interface PageDependencies {
    history: AppMountParameters['history'];
    setHeaderActionMenu?: AppMountParameters['setHeaderActionMenu'];
    setBreadcrumbs: ChromeStart['setBreadcrumbs'];
}
export declare const PageLoader: FC<PropsWithChildren<{
    context: RouteResolverContext;
}>>;
/**
 * `MlRouter` is based on `BrowserRouter` and takes in `ScopedHistory` provided
 * by Kibana. `LegacyHashUrlRedirect` provides compatibility with legacy hash based URLs.
 * `UrlStateProvider` manages state stored in `_g/_a` URL parameters which can be
 * use in components further down via `useUrlState()`.
 */
export declare const MlRouter: FC<{
    pageDeps: PageDependencies;
    entryPoint?: string;
}>;
export declare function createPath(page: MlPages, additionalPrefix?: string): string;
export {};
