import type { CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { Plugin } from '@kbn/core/public';
import type { CoreSetup } from '@kbn/core/public';
import type { ConfigSchema } from '@kbn/file-upload-common';
import { getMaxBytesFormatted } from './application/common/util/get_max_bytes';
import type { DataVisualizerSetupDependencies, DataVisualizerStartDependencies } from './application/common/types/data_visualizer_plugin';
export type DataVisualizerPluginSetup = ReturnType<DataVisualizerPlugin['setup']>;
export type DataVisualizerPluginStart = ReturnType<DataVisualizerPlugin['start']>;
export type DataVisualizerCoreSetup = CoreSetup<DataVisualizerStartDependencies, DataVisualizerPluginStart>;
export declare class DataVisualizerPlugin implements Plugin<DataVisualizerPluginSetup, DataVisualizerPluginStart, DataVisualizerSetupDependencies, DataVisualizerStartDependencies> {
    private resultsLinks;
    constructor(initializerContext: PluginInitializerContext<ConfigSchema>);
    setup(core: DataVisualizerCoreSetup, plugins: DataVisualizerSetupDependencies): Promise<void>;
    start(core: CoreStart, plugins: DataVisualizerStartDependencies): {
        getIndexDataVisualizerComponent: () => Promise<() => import("./application").IndexDataVisualizerSpec>;
        getDataDriftComponent: () => Promise<() => import("./application").DataDriftSpec>;
        getMaxBytesFormatted: typeof getMaxBytesFormatted;
        FieldStatsUnavailableMessage: import("react").ForwardRefExoticComponent<{
            id?: string;
            title?: string;
        } & import("react").RefAttributes<{}>>;
        FieldStatisticsTable: import("react").ForwardRefExoticComponent<import("./application/index_data_visualizer/embeddables/grid_embeddable/types").FieldStatisticTableEmbeddableProps & import("react").RefAttributes<{}>>;
    };
}
