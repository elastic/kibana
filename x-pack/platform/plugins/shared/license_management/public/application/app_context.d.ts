import React from 'react';
import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/public';
import type { ILicense } from '@kbn/licensing-types';
import type { TelemetryPluginStart } from '@kbn/telemetry-plugin/public';
import type { ClientConfigType } from '../types';
import type { BreadcrumbService } from './breadcrumbs';
export interface AppDependencies {
    core: CoreStart;
    services: {
        breadcrumbService: BreadcrumbService;
        history: ScopedHistory;
    };
    plugins: {
        licensing: LicensingPluginSetup;
        telemetry?: TelemetryPluginStart;
    };
    docLinks: {
        security: string;
    };
    store: {
        initialLicense: ILicense;
    };
    config: ClientConfigType;
}
export declare const AppContextProvider: ({ children, value, }: {
    value: AppDependencies;
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const AppContextConsumer: React.Consumer<AppDependencies | undefined>;
export declare const useAppContext: () => AppDependencies;
