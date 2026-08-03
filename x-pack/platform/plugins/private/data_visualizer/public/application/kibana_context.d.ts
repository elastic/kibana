import type { CoreStart } from '@kbn/core/public';
import type { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { DataVisualizerStartDependencies } from './common/types/data_visualizer_plugin';
export type StartServices = CoreStart & DataVisualizerStartDependencies & {
    storage: IStorageWrapper;
};
export type DataVisualizerKibanaReactContextValue = KibanaReactContextValue<StartServices>;
export declare const useDataVisualizerKibana: () => KibanaReactContextValue<Partial<CoreStart> & CoreStart & DataVisualizerStartDependencies & {
    storage: IStorageWrapper;
}>;
