import type { TimeRange } from '@kbn/es-query';
import type { MlEmbeddableBaseApi } from '../embeddables';
export declare const getEmbeddableTimeRange: <StateType extends object = object>(embeddable: MlEmbeddableBaseApi<StateType>) => TimeRange | undefined;
