import type { ResultLinks } from '@kbn/file-upload-common';
import type { DataDriftSpec, IndexDataVisualizerSpec } from '../application';
export interface SpecWithLinks<T> {
    resultLinks: ResultLinks;
    component: T;
}
export declare function getComponents(resultLinks: ResultLinks): {
    getIndexDataVisualizerComponent: () => Promise<() => IndexDataVisualizerSpec>;
    getDataDriftComponent: () => Promise<() => DataDriftSpec>;
};
