import type { TinymathLocation } from '@kbn/tinymath';
import type { DateRange, IndexPattern, GenericIndexPatternColumn, FormBasedLayer, FormulaIndexPatternColumn } from '@kbn/lens-common';
import type { GenericOperationDefinition } from '..';
/** @internal **/
export declare function getManagedId(mainId: string, index: number): string;
interface ExpandColumnProperties {
    indexPattern: IndexPattern;
    operations?: Record<string, GenericOperationDefinition>;
    dateRange?: DateRange;
    strictShiftValidation?: boolean;
}
/** @internal **/
export declare function insertOrReplaceFormulaColumn(id: string, column: FormulaIndexPatternColumn, baseLayer: FormBasedLayer, params: ExpandColumnProperties): {
    layer: {
        columns: Record<string, GenericIndexPatternColumn>;
        columnOrder: string[];
        indexPatternId: string;
        linkToLayers?: string[];
        incompleteColumns?: Record<string, import("@kbn/lens-common").IncompleteColumn | undefined>;
        sampling?: number;
        ignoreGlobalFilters?: boolean;
    };
    meta: {
        locations: Record<string, TinymathLocation>;
    };
};
export {};
