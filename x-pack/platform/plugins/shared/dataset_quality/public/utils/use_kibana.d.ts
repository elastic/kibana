import type { CoreStart } from '@kbn/core/public';
import type { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import type { DatasetQualityStartDeps } from '../types';
export type PluginKibanaContextValue = CoreStart & DatasetQualityStartDeps;
export declare const createKibanaContextForPlugin: (core: CoreStart, plugins: DatasetQualityStartDeps) => import("@kbn/kibana-react-plugin/public").KibanaReactContext<PluginKibanaContextValue>;
export declare const useKibanaContextForPlugin: () => KibanaReactContextValue<PluginKibanaContextValue>;
export declare const useKibanaContextForPluginProvider: (core: CoreStart, plugins: DatasetQualityStartDeps) => import("react").FC<import("react").PropsWithChildren<{
    services?: PluginKibanaContextValue | undefined;
}>>;
