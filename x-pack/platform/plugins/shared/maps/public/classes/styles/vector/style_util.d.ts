import type { MB_LOOKUP_FUNCTION, VECTOR_STYLES } from '../../../../common/constants';
import { ICON_SOURCE } from '../../../../common/constants';
import type { Category } from '../../../../common/descriptor_types';
import type { StaticTextProperty } from './properties/static_text_property';
import type { DynamicTextProperty } from './properties/dynamic_text_property';
export declare const OTHER_CATEGORY_LABEL: string;
export declare const OTHER_CATEGORY_DEFAULT_COLOR = "#cad3e2";
export declare function getComputedFieldName(styleName: VECTOR_STYLES, fieldName: string): string;
export declare function getComputedFieldNamePrefix(fieldName: string): string;
export declare function dynamicRound(value: number | string): string | number;
export declare function assignCategoriesToPalette({ categories, paletteValues, }: {
    categories: Category[];
    paletteValues: string[];
}): {
    stops: {
        stop: string;
        style: string;
        iconSource: ICON_SOURCE;
    }[];
    fallbackSymbolId: string | null;
};
export declare function makeMbClampedNumberExpression({ lookupFunction, fieldName, minValue, maxValue, fallback, }: {
    lookupFunction: MB_LOOKUP_FUNCTION;
    fieldName: string;
    minValue: number;
    maxValue: number;
    fallback: number;
}): (string | number | (string | number | (string | string[] | null)[] | (string | number | (string | number | (string | string[])[])[])[])[])[];
export declare function getHasLabel(label: StaticTextProperty | DynamicTextProperty): boolean;
