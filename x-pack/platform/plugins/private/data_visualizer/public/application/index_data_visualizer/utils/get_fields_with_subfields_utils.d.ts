import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldStatisticTableEmbeddableProps } from '../embeddables/grid_embeddable/types';
/**
 * Helper logic to add multi-fields to the table for embeddables outside of Index data visualizer
 * For example, adding {field} will also add {field.keyword} if it exists
 * @param indexPatternTitle
 * @returns
 */
export declare const getFieldsWithSubFields: ({ input, currentDataView, shouldGetSubfields, }: {
    input: FieldStatisticTableEmbeddableProps;
    currentDataView: DataView;
    shouldGetSubfields: boolean;
}) => {
    visibleFieldNames: string[] | undefined;
    fieldsToFetch: string[] | undefined;
};
