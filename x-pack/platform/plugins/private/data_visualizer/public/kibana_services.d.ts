import type { CoreStart } from '@kbn/core/public';
import type { DataVisualizerStartDependencies } from './application/common/types/data_visualizer_plugin';
export declare function setStartServices(core: CoreStart, plugins: DataVisualizerStartDependencies): void;
export declare const getCoreStart: () => CoreStart;
export declare const getPluginsStart: () => DataVisualizerStartDependencies;
