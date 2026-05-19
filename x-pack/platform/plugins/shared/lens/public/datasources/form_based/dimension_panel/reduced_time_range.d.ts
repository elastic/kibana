import React from 'react';
import type { GenericIndexPatternColumn, FormBasedLayer, IndexPattern } from '@kbn/lens-common';
export declare function setReducedTimeRange(columnId: string, layer: FormBasedLayer, reducedTimeRange: string | undefined, skipLabelUpdate?: boolean): {
    columns: {
        [x: string]: import("@kbn/lens-common").BaseIndexPatternColumn | import("@kbn/lens-common").FieldBasedIndexPatternColumn | import("@kbn/lens-common").ReferenceBasedIndexPatternColumn | {
            reducedTimeRange: string | undefined;
            label: string;
            operationType: string;
            customLabel?: boolean;
            timeScale?: import("@kbn/lens-common").TimeScaleUnit;
            filter?: import("@kbn/data-plugin/common").Query;
            timeShift?: string;
            sortingHint?: import("@kbn/lens-common").SortingHint;
            interval?: string;
            dataType: import("@kbn/lens-common").DataType;
            isBucketed: boolean;
            scale?: "ordinal" | "interval" | "ratio";
            isStaticValue?: boolean;
            hasArraySupport?: boolean;
        } | {
            reducedTimeRange: string | undefined;
            label: string;
            sourceField: string;
            operationType: string;
            customLabel?: boolean;
            timeScale?: import("@kbn/lens-common").TimeScaleUnit;
            filter?: import("@kbn/data-plugin/common").Query;
            timeShift?: string;
            sortingHint?: import("@kbn/lens-common").SortingHint;
            interval?: string;
            dataType: import("@kbn/lens-common").DataType;
            isBucketed: boolean;
            scale?: "ordinal" | "interval" | "ratio";
            isStaticValue?: boolean;
            hasArraySupport?: boolean;
        } | {
            reducedTimeRange: string | undefined;
            label: string;
            references: string[];
            params?: {
                format?: import("@kbn/lens-common").ValueFormatConfig;
            };
            operationType: string;
            customLabel?: boolean;
            timeScale?: import("@kbn/lens-common").TimeScaleUnit;
            filter?: import("@kbn/data-plugin/common").Query;
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
export declare function ReducedTimeRange({ selectedColumn, columnId, layer, updateLayer, indexPattern, helpMessage, skipLabelUpdate, }: {
    selectedColumn: GenericIndexPatternColumn;
    columnId: string;
    layer: FormBasedLayer;
    updateLayer: (newLayer: FormBasedLayer) => void;
    indexPattern: IndexPattern;
    helpMessage: string | null;
    skipLabelUpdate?: boolean;
}): React.JSX.Element | null;
