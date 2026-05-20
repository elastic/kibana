import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { ResultLinks } from '@kbn/file-upload-common';
import type { CoreSetup } from '@kbn/core/public';
import type { DataVisualizerStartDependencies } from './application/common/types/data_visualizer_plugin';
export declare function registerHomeAddData(getStartServices: CoreSetup<DataVisualizerStartDependencies>['getStartServices'], home: HomePublicPluginSetup, resultsLinks: ResultLinks): void;
export declare function registerHomeFeatureCatalogue(home: HomePublicPluginSetup): void;
