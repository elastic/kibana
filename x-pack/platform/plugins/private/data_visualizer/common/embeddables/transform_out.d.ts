import type { Reference } from '@kbn/content-management-utils';
import type { FieldStatisticsTableEmbeddableState, StoredFieldStatisticsTableEmbeddableState } from './types';
export declare function transformOut(storedState: StoredFieldStatisticsTableEmbeddableState, references?: Reference[]): FieldStatisticsTableEmbeddableState;
