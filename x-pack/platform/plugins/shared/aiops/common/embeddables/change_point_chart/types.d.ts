import type { ChangePointChartEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';
export type StoredChangePointChartEmbeddableState = Omit<ChangePointChartEmbeddableState, 'data_view_id'>;
