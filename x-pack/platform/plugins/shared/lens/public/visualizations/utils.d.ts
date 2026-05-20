import type { VisualizationConfigProps } from '@kbn/lens-common';
export declare function getColumnFromActiveData({ accessor, layerId, activeData, }: {
    accessor: string | undefined;
    layerId: string;
    activeData: VisualizationConfigProps['frame']['activeData'];
}): import("@kbn/expressions-plugin/common").DatatableColumn | undefined;
