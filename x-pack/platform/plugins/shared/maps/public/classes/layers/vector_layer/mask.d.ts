import type { MapGeoJSONFeature } from '@kbn/mapbox-gl';
import type { IESAggField } from '../../fields/agg';
import { MASK_OPERATOR } from '../../../../common/constants';
export declare const BELOW: string;
export declare const ABOVE: string;
export declare const BUCKETS: string;
export declare function getMaskI18nValue(operator: MASK_OPERATOR, value: number): string;
export declare function getMaskI18nLabel({ bucketsName, isJoin, }: {
    bucketsName?: string;
    isJoin: boolean;
}): string;
export declare function getMaskI18nDescription({ aggLabel, bucketsName, isJoin, }: {
    aggLabel?: string;
    bucketsName?: string;
    isJoin: boolean;
}): string;
export declare class Mask {
    private readonly _esAggField;
    private readonly _isGeometrySourceMvt;
    private readonly _operator;
    private readonly _value;
    constructor({ esAggField, isGeometrySourceMvt, operator, value, }: {
        esAggField: IESAggField;
        isGeometrySourceMvt: boolean;
        operator: MASK_OPERATOR;
        value: number;
    });
    private _isFeatureState;
    getMatchMaskedExpression(): (string | number | string[])[];
    getMatchUnmaskedExpression(): (string | number | string[])[];
    getEsAggField(): IESAggField;
    getFieldOriginListLabel(): string;
    getOperator(): MASK_OPERATOR;
    getValue(): number;
    isFeatureMasked(feature: MapGeoJSONFeature): boolean;
}
