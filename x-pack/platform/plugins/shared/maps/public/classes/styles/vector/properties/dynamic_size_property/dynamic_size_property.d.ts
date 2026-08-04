import React from 'react';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import { DynamicStyleProperty } from '../dynamic_style_property';
import type { FieldFormatter } from '../../../../../../common/constants';
import { VECTOR_STYLES } from '../../../../../../common/constants';
import type { SizeDynamicOptions } from '../../../../../../common/descriptor_types';
import type { IField } from '../../../../fields/field';
import type { IVectorLayer } from '../../../../layers/vector_layer';
export declare class DynamicSizeProperty extends DynamicStyleProperty<SizeDynamicOptions> {
    private readonly _isSymbolizedAsIcon;
    constructor(options: SizeDynamicOptions, styleName: VECTOR_STYLES, field: IField | null, vectorLayer: IVectorLayer, getFieldFormatter: (fieldName: string) => null | FieldFormatter, isSymbolizedAsIcon: boolean);
    supportsFeatureState(): boolean;
    syncHaloWidthWithMb(mbLayerId: string, mbMap: MbMap): void;
    syncIconSizeWithMb(symbolLayerId: string, mbMap: MbMap): void;
    syncCircleStrokeWidthWithMb(mbLayerId: string, mbMap: MbMap): void;
    syncCircleRadiusWithMb(mbLayerId: string, mbMap: MbMap): void;
    syncLineWidthWithMb(mbLayerId: string, mbMap: MbMap): void;
    syncLabelSizeWithMb(mbLayerId: string, mbMap: MbMap): void;
    getMbSizeExpression(options?: {
        forceFeatureProperties?: boolean;
        maxStopOutput?: unknown;
        minStopOutput?: unknown;
    }): number | {}[] | null;
    getMaxStopOutput(): number;
    getMinStopOutput(): number;
    isSizeDynamicConfigComplete(): boolean | null;
    renderLegendDetailRow(): React.JSX.Element;
}
