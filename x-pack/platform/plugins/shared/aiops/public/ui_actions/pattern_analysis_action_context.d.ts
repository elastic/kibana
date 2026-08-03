import { type EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { ChangePointEmbeddableApi } from '../embeddables/change_point_chart/types';
export interface PatternAnalysisActionContext extends EmbeddableApiContext {
    embeddable: ChangePointEmbeddableApi;
}
export declare function isPatternAnalysisEmbeddableContext(arg: unknown): arg is PatternAnalysisActionContext;
