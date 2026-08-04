import React from 'react';
import type { GenericIndexPatternColumn, TimeScaleUnit, FormBasedLayer } from '@kbn/lens-common';
export declare function setTimeScaling(columnId: string, layer: FormBasedLayer, timeScale: TimeScaleUnit | undefined): {
    columns: {
        [x: string]: import("@kbn/lens-common").BaseIndexPatternColumn | import("@kbn/lens-common").FieldBasedIndexPatternColumn | import("@kbn/lens-common").ReferenceBasedIndexPatternColumn | {
            label: string;
            timeScale: TimeScaleUnit | undefined;
            operationType: string;
            customLabel?: boolean;
            filter?: import("@kbn/es-query").Query;
            reducedTimeRange?: string;
            timeShift?: string;
            sortingHint?: import("@kbn/lens-common").SortingHint;
            interval?: string;
            dataType: import("@kbn/lens-common").DataType;
            isBucketed: boolean;
            scale?: "ordinal" | "interval" | "ratio";
            isStaticValue?: boolean;
            hasArraySupport?: boolean;
        } | {
            label: string;
            timeScale: TimeScaleUnit | undefined;
            sourceField: string;
            operationType: string;
            customLabel?: boolean;
            filter?: import("@kbn/es-query").Query;
            reducedTimeRange?: string;
            timeShift?: string;
            sortingHint?: import("@kbn/lens-common").SortingHint;
            interval?: string;
            dataType: import("@kbn/lens-common").DataType;
            isBucketed: boolean;
            scale?: "ordinal" | "interval" | "ratio";
            isStaticValue?: boolean;
            hasArraySupport?: boolean;
        } | {
            label: string;
            timeScale: TimeScaleUnit | undefined;
            references: string[];
            params?: {
                format?: import("@kbn/lens-common").ValueFormatConfig;
            };
            operationType: string;
            customLabel?: boolean;
            filter?: import("@kbn/es-query").Query;
            reducedTimeRange?: string;
            timeShift?: string;
            sortingHint?: import("@kbn/lens-common").SortingHint;
            interval?: string;
            dataType: import("@kbn/lens-common").DataType;
            isBucketed: boolean;
            scale?: "ordinal" | "interval" | "ratio";
            isStaticValue?: boolean;
            hasArraySupport?: boolean;
        };
    };
    columnOrder: string[];
    indexPatternId: string;
    linkToLayers?: string[];
    incompleteColumns?: Record<string, import("@kbn/lens-common").IncompleteColumn | undefined>;
    sampling?: number;
    ignoreGlobalFilters?: boolean;
};
export interface TimeScalingProps {
    selectedColumn: GenericIndexPatternColumn;
    columnId: string;
    layer: FormBasedLayer;
    updateLayer: (newLayer: FormBasedLayer) => void;
}
export declare function TimeScaling({ selectedColumn, columnId, layer, updateLayer }: TimeScalingProps): React.JSX.Element | null;
