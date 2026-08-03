import type { Logger, SavedObjectsServiceStart } from '@kbn/core/server';
import type { SolutionId } from '@kbn/core-chrome-browser';
interface Deps {
    getSavedObjects: () => Promise<Pick<SavedObjectsServiceStart, 'createInternalRepository'>>;
    logger: Logger;
    solution?: SolutionId;
}
export declare function createDefaultSpace({ getSavedObjects, logger, solution }: Deps): Promise<void>;
export {};
