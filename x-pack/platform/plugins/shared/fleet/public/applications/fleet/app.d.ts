import React from 'react';
import type { AppMountParameters } from '@kbn/core/public';
import type { History } from 'history';
import type { FleetConfigType, FleetStartServices } from '../../plugin';
import { type FleetStatusProviderProps } from './hooks';
import type { UIExtensionsStorage } from './types';
export declare const WithPermissionsAndSetup: React.NamedExoticComponent<{
    children?: React.ReactNode;
}>;
/**
 * Fleet Application context all the way down to the Router, but with no permissions or setup checks
 * and no routes defined
 */
export declare const FleetAppContext: React.FC<{
    startServices: FleetStartServices;
    config: FleetConfigType;
    history: AppMountParameters['history'];
    kibanaVersion: string;
    extensions: UIExtensionsStorage;
    /** For testing purposes only */
    routerHistory?: History<any>;
    fleetStatus?: FleetStatusProviderProps;
    children: React.ReactNode;
}>;
export declare const AppRoutes: React.MemoExoticComponent<({ setHeaderActionMenu }: {
    setHeaderActionMenu: AppMountParameters["setHeaderActionMenu"];
}) => React.JSX.Element>;
