import type { EuiIconProps, IconType } from '@elastic/eui';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { PartitionLegendValue } from '@kbn/expression-partition-vis-plugin/common';
import type { PartitionChartType as PieChartType, SharedPartitionLayerState as SharedLensPartitionLayerState, EmptySizeRatiosType } from '@kbn/lens-common';
interface PartitionChartMeta {
    id: string;
    icon: ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => JSX.Element;
    label: string;
    maxBuckets: number;
    showExperimentalBadge?: boolean;
    sortPriority: number;
    description: string;
    toolbar: {
        isDisabled?: boolean;
        categoryOptions: Array<{
            id: SharedLensPartitionLayerState['categoryDisplay'];
            label: string;
        }>;
        numberOptions: Array<{
            id: SharedLensPartitionLayerState['numberDisplay'];
            label: string;
        }>;
        emptySizeRatioOptions?: Array<{
            id: string;
            value: EmptySizeRatiosType | 0;
            label: string;
            icon?: IconType;
        }>;
    };
    legend: {
        flat?: boolean;
        defaultLegendStats?: PartitionLegendValue[];
        hideNestedLegendSwitch?: boolean;
        getShowLegendDefault?: (bucketColumns: DatatableColumn[]) => boolean;
    };
}
export declare const PartitionChartsMeta: Record<PieChartType, PartitionChartMeta>;
export declare const visualizationTypes: (PartitionChartMeta | {
    subtypes: string[];
    id: string;
    icon: ({ title, titleId, ...props }: Omit<EuiIconProps, "type">) => JSX.Element;
    label: string;
    maxBuckets: number;
    showExperimentalBadge?: boolean;
    sortPriority: number;
    description: string;
    toolbar: {
        isDisabled?: boolean;
        categoryOptions: Array<{
            id: SharedLensPartitionLayerState["categoryDisplay"];
            label: string;
        }>;
        numberOptions: Array<{
            id: SharedLensPartitionLayerState["numberDisplay"];
            label: string;
        }>;
        emptySizeRatioOptions?: Array<{
            id: string;
            value: EmptySizeRatiosType | 0;
            label: string;
            icon?: IconType;
        }>;
    };
    legend: {
        flat?: boolean;
        defaultLegendStats?: PartitionLegendValue[];
        hideNestedLegendSwitch?: boolean;
        getShowLegendDefault?: (bucketColumns: DatatableColumn[]) => boolean;
    };
})[];
export {};
