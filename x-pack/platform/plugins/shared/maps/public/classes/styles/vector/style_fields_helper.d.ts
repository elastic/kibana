import { FIELD_ORIGIN, VECTOR_STYLES } from '../../../../common/constants';
import type { IField } from '../../fields/field';
import type { IStyleProperty } from './properties/style_property';
export interface StyleField {
    label: string;
    name: string;
    origin: FIELD_ORIGIN;
    type: string;
    supportsAutoDomain: boolean;
    isUnsupported: boolean;
    unsupportedMsg?: string;
}
export declare function createStyleFieldsHelper(fields: IField[]): Promise<StyleFieldsHelper>;
export declare class StyleFieldsHelper {
    private readonly _styleFields;
    private readonly _ordinalAndCategoricalFields;
    private readonly _numberFields;
    private readonly _ordinalFields;
    constructor(styleFields: StyleField[]);
    hasFieldForStyle(field: IField, styleName: VECTOR_STYLES): boolean;
    _getFieldsForStyle(styleName: VECTOR_STYLES): StyleField[];
    getFieldsForStyle(styleProperty: IStyleProperty<unknown>, isLayerSourceMvt: boolean): StyleField[];
    getStyleFields(): StyleField[];
}
