import type { PropsOf } from '@elastic/eui';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import type { LogsSharedClientCoreSetup, LogsSharedClientStartDeps, LogsSharedClientStartExports } from '../types';
export type PluginKibanaContextValue = CoreStart & LogsSharedClientStartDeps & {
    logsShared: LogsSharedClientStartExports;
};
export declare const createKibanaContextForPlugin: (core: CoreStart, plugins: LogsSharedClientStartDeps, pluginStart: LogsSharedClientStartExports) => import("@kbn/kibana-react-plugin/public").KibanaReactContext<PluginKibanaContextValue>;
export declare const useKibanaContextForPlugin: () => KibanaReactContextValue<PluginKibanaContextValue>;
export declare const useKibanaContextForPluginProvider: (core: CoreStart, plugins: LogsSharedClientStartDeps, pluginStart: LogsSharedClientStartExports) => React.FC<React.PropsWithChildren<{
    services?: PluginKibanaContextValue | undefined;
}>>;
export declare const createLazyComponentWithKibanaContext: <T extends React.ComponentType<any>>(coreSetup: LogsSharedClientCoreSetup, lazyComponentFactory: () => Promise<{
    default: T;
}>) => React.LazyExoticComponent<(props: PropsOf<T>) => React.JSX.Element>;
