import type { ResultLinks } from '@kbn/file-upload-common';
import type { DataDriftSpec, IndexDataVisualizerSpec } from '../application';
interface LazyLoadedModules {
    IndexDataVisualizer: IndexDataVisualizerSpec;
    DataDrift: DataDriftSpec;
    resultsLinks: ResultLinks;
}
export declare function lazyLoadModules(resultsLinks: ResultLinks): Promise<LazyLoadedModules>;
export {};
