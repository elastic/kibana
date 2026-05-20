import type { Reference } from '@kbn/content-management-utils';
import type { ChangePointEmbeddableState, StoredChangePointEmbeddableState } from './types';
export declare function transformOut(storedState: StoredChangePointEmbeddableState, references?: Reference[]): ChangePointEmbeddableState;
