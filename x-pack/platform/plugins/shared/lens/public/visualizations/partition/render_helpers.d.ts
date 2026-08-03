import type { Datatable } from '@kbn/expressions-plugin/public';
import type { PartitionChartType as PieChartType, LensPartitionLayerState } from '@kbn/lens-common';
export declare const getLegendStats: (layer: LensPartitionLayerState, shape: PieChartType) => import("@kbn/expression-partition-vis-plugin/common").PartitionLegendValue[] | undefined;
export declare const checkTableForContainsSmallValues: (dataTable: Datatable, columnId: string, minPercentage: number) => boolean;
