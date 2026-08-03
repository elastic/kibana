import type { Reference } from '@kbn/content-management-utils';
import type { ChangePointChartEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';
import type { StoredChangePointChartEmbeddableState } from './types';
export declare function transformOut(storedState: StoredChangePointChartEmbeddableState, references?: Reference[]): ChangePointChartEmbeddableState;
