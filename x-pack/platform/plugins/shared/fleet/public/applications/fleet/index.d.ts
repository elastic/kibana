import React from 'react';
import type { RouteProps } from 'react-router-dom';
import type { CoreStart, AppMountParameters } from '@kbn/core/public';
import type { FleetConfigType, FleetStartServices } from '../../plugin';
import type { UIExtensionsStorage } from './types';
export interface ProtectedRouteProps extends RouteProps {
    isAllowed?: boolean;
    restrictedPath?: string;
}
export declare const ProtectedRoute: React.FunctionComponent<ProtectedRouteProps>;
export declare function renderApp(startServices: FleetStartServices, { element, history, setHeaderActionMenu }: AppMountParameters, config: FleetConfigType, kibanaVersion: string, extensions: UIExtensionsStorage): () => void;
export declare const teardownFleet: (coreStart: CoreStart) => void;
