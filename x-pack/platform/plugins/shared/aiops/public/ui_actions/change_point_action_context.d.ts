import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { ChangePointEmbeddableApi } from '../embeddables/change_point_chart/types';
export interface ChangePointChartActionContext extends EmbeddableApiContext {
    embeddable: ChangePointEmbeddableApi;
}
export declare function isChangePointChartEmbeddableContext(arg: unknown): arg is ChangePointChartActionContext;
