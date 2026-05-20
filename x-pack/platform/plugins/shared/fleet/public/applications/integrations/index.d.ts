import React from 'react';
import type { RouteProps } from 'react-router-dom';
import type { CoreStart, AppMountParameters } from '@kbn/core/public';
import type { FleetConfigType, FleetStartServices } from '../../plugin';
import type { UIExtensionsStorage } from '../../types';
export interface ProtectedRouteProps extends RouteProps {
    isAllowed?: boolean;
    restrictedPath?: string;
}
export declare const ProtectedRoute: React.FunctionComponent<ProtectedRouteProps>;
export declare function renderApp(startServices: FleetStartServices, { element, appBasePath, history, setHeaderActionMenu }: AppMountParameters, config: FleetConfigType, kibanaVersion: string, extensions: UIExtensionsStorage, UsageTracker: React.FC<{
    children: React.ReactNode;
}>): () => void;
export declare const teardownIntegrations: (coreStart: CoreStart) => void;
