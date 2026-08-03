import type { Reference } from '@kbn/content-management-utils';
import type { FieldStatsTableEmbeddableState } from '@kbn/data-visualizer-server-schemas/embeddables/field_stats';
import { type RawFieldStatsState } from './normalize_legacy_state';
export declare function transformOut(storedState: RawFieldStatsState, references?: Reference[]): FieldStatsTableEmbeddableState;
