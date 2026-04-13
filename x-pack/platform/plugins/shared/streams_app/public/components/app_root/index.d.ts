import React from 'react';
import { type AppMountParameters, type CoreStart } from '@kbn/core/public';
import type { StreamsAppStartDependencies } from '../../types';
import type { StreamsAppServices } from '../../services/types';
export declare function AppRoot({ coreStart, pluginsStart, services, appMountParameters, isServerless, }: {
    coreStart: CoreStart;
    pluginsStart: StreamsAppStartDependencies;
    services: StreamsAppServices;
    isServerless: boolean;
} & {
    appMountParameters: AppMountParameters;
}): React.JSX.Element;
