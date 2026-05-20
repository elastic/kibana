import React from 'react';
import type { AppMountParameters } from '@kbn/core/public';
import type { History } from 'history';
import type { FleetConfigType, FleetStartServices } from '../../plugin';
import { type FleetStatusProviderProps } from '../../hooks';
import type { UIExtensionsStorage } from './types';
/**
 * Fleet Application context all the way down to the Router, but with no permissions or setup checks
 * and no routes defined
 */
export declare const IntegrationsAppContext: React.FC<{
    basepath: string;
    startServices: FleetStartServices;
    config: FleetConfigType;
    history: AppMountParameters['history'];
    kibanaVersion: string;
    extensions: UIExtensionsStorage;
    setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
    /** For testing purposes only */
    routerHistory?: History<any>;
    fleetStatus?: FleetStatusProviderProps;
    children: React.ReactNode;
}>;
export declare const AppRoutes: React.MemoExoticComponent<() => React.JSX.Element>;
