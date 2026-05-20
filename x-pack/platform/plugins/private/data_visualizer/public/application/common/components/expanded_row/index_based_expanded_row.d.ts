import React from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { FieldVisConfig } from '../stats_table/types';
import type { CombinedQuery } from '../../../index_data_visualizer/types/combined_query';
export declare const IndexBasedDataVisualizerExpandedRow: ({ item, dataView, combinedQuery, onAddFilter, esql, totalDocuments, timeFieldName, typeAccessor, onVisibilityChange, }: {
    item: FieldVisConfig;
    dataView: DataView | undefined;
    combinedQuery?: CombinedQuery;
    esql?: string;
    totalDocuments?: number;
    typeAccessor?: "type" | "secondaryType";
    /**
     * Callback to add a filter to filter bar
     */
    onAddFilter?: (field: DataViewField | string, value: string, type: "+" | "-") => void;
    timeFieldName?: string;
    onVisibilityChange?: (visible: boolean, item: FieldVisConfig) => void;
}) => React.JSX.Element;
