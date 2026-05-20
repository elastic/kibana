import type { Reference } from '@kbn/content-management-utils';
import type { LensSerializedState } from '../../public';
export declare const injectLensReferences: (state: LensSerializedState, references?: Reference[]) => LensSerializedState;
export declare const extractLensReferences: (state: LensSerializedState) => {
    state: LensSerializedState;
    references: Reference[];
};
