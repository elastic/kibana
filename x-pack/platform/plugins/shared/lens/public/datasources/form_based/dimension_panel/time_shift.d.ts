import React from 'react';
import { type DatatableUtilitiesService } from '@kbn/data-plugin/common';
import type { GenericIndexPatternColumn, FormBasedLayer, IndexPattern } from '@kbn/lens-common';
import type { FormBasedDimensionEditorProps } from './dimension_panel';
export declare function setTimeShift(columnId: string, layer: FormBasedLayer, timeShift: string | undefined): {
    columns: {
        [x: string]: import("@kbn/lens-common").BaseIndexPatternColumn | import("@kbn/lens-common").FieldBasedIndexPatternColumn | import("@kbn/lens-common").ReferenceBasedIndexPatternColumn | {
            label: string;
            timeShift: string | undefined;
            operationType: string;
            customLabel?: boolean;
            timeScale?: import("@kbn/lens-common").TimeScaleUnit;
            filter?: import("@kbn/data-plugin/common").Query;
            reducedTimeRange?: string;
            sortingHint?: import("@kbn/lens-common").SortingHint;
            interval?: string;
            dataType: import("@kbn/lens-common").DataType;
            isBucketed: boolean;
            scale?: "ordinal" | "interval" | "ratio";
            isStaticValue?: boolean;
            hasArraySupport?: boolean;
        } | {
            label: string;
            timeShift: string | undefined;
            sourceField: string;
            operationType: string;
            customLabel?: boolean;
            timeScale?: import("@kbn/lens-common").TimeScaleUnit;
            filter?: import("@kbn/data-plugin/common").Query;
            reducedTimeRange?: string;
            sortingHint?: import("@kbn/lens-common").SortingHint;
            interval?: string;
            dataType: import("@kbn/lens-common").DataType;
            isBucketed: boolean;
            scale?: "ordinal" | "interval" | "ratio";
            isStaticValue?: boolean;
            hasArraySupport?: boolean;
        } | {
            label: string;
            timeShift: string | undefined;
            references: string[];
            params?: {
                format?: import("@kbn/lens-common").ValueFormatConfig;
            };
            operationType: string;
            customLabel?: boolean;
            timeScale?: import("@kbn/lens-common").TimeScaleUnit;
            filter?: import("@kbn/data-plugin/common").Query;
            reducedTimeRange?: string;
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
export declare function TimeShift({ datatableUtilities, selectedColumn, columnId, layer, updateLayer, indexPattern, activeData, layerId, }: {
    datatableUtilities: DatatableUtilitiesService;
    selectedColumn: GenericIndexPatternColumn;
    indexPattern: IndexPattern;
    columnId: string;
    layer: FormBasedLayer;
    updateLayer: (newLayer: FormBasedLayer) => void;
    activeData: FormBasedDimensionEditorProps['activeData'];
    layerId: string;
}): React.JSX.Element | null;
