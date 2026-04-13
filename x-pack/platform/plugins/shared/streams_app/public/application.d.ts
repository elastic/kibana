import { type AppMountParameters, type CoreStart } from '@kbn/core/public';
import React from 'react';
import type { StreamsAppServices } from './services/types';
import type { StreamsAppStartDependencies } from './types';
export declare const StreamsApplication: ({ coreStart, pluginsStart, services, appMountParameters, isServerless, }: {
    coreStart: CoreStart;
    pluginsStart: StreamsAppStartDependencies;
    services: StreamsAppServices;
    isServerless: boolean;
} & {
    appMountParameters: AppMountParameters;
}) => React.ReactElement<any, string | React.JSXElementConstructor<any>>;
