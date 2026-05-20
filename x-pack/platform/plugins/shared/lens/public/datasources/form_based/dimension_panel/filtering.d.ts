import React from 'react';
import type { Query } from '@kbn/es-query';
import type { GenericIndexPatternColumn, FormBasedLayer, IndexPattern } from '@kbn/lens-common';
export declare function setFilter(columnId: string, layer: FormBasedLayer, query: Query | undefined): {
    columns: {
        [x: string]: import("@kbn/lens-common").BaseIndexPatternColumn | import("@kbn/lens-common").FieldBasedIndexPatternColumn | import("@kbn/lens-common").ReferenceBasedIndexPatternColumn | {
            filter: Query | undefined;
            operationType: string;
            customLabel?: boolean;
            timeScale?: import("@kbn/lens-common").TimeScaleUnit;
            reducedTimeRange?: string;
            timeShift?: string;
            label: string;
            sortingHint?: import("@kbn/lens-common").SortingHint;
            interval?: string;
            dataType: import("@kbn/lens-common").DataType;
            isBucketed: boolean;
            scale?: "ordinal" | "interval" | "ratio";
            isStaticValue?: boolean;
            hasArraySupport?: boolean;
        } | {
            filter: Query | undefined;
            sourceField: string;
            operationType: string;
            customLabel?: boolean;
            timeScale?: import("@kbn/lens-common").TimeScaleUnit;
            reducedTimeRange?: string;
            timeShift?: string;
            label: string;
            sortingHint?: import("@kbn/lens-common").SortingHint;
            interval?: string;
            dataType: import("@kbn/lens-common").DataType;
            isBucketed: boolean;
            scale?: "ordinal" | "interval" | "ratio";
            isStaticValue?: boolean;
            hasArraySupport?: boolean;
        } | {
            filter: Query | undefined;
            references: string[];
            params?: {
                format?: import("@kbn/lens-common").ValueFormatConfig;
            };
            operationType: string;
            customLabel?: boolean;
            timeScale?: import("@kbn/lens-common").TimeScaleUnit;
            reducedTimeRange?: string;
            timeShift?: string;
            label: string;
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
export declare function Filtering({ selectedColumn, columnId, layer, updateLayer, indexPattern, helpMessage, }: {
    selectedColumn: GenericIndexPatternColumn;
    indexPattern: IndexPattern;
    columnId: string;
    layer: FormBasedLayer;
    updateLayer: (newLayer: FormBasedLayer) => void;
    helpMessage: string | null;
}): React.JSX.Element | null;
