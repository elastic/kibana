import type { Map as MbMap } from '@kbn/mapbox-gl';
import React from 'react';
import { DynamicStyleProperty } from './dynamic_style_property';
import type { FieldFormatter, VECTOR_STYLES } from '../../../../../common/constants';
import { DATA_MAPPING_FUNCTION } from '../../../../../common/constants';
import type { Break } from '../components/legend/breaked_legend';
import type { ColorDynamicOptions } from '../../../../../common/descriptor_types';
import type { LegendProps } from './style_property';
import type { IField } from '../../../fields/field';
import type { IVectorLayer } from '../../../layers/vector_layer/vector_layer';
export declare class DynamicColorProperty extends DynamicStyleProperty<ColorDynamicOptions> {
    private readonly _chartsPaletteServiceGetColor?;
    constructor(options: ColorDynamicOptions, styleName: VECTOR_STYLES, field: IField | null, vectorLayer: IVectorLayer, getFieldFormatter: (fieldName: string) => null | FieldFormatter, chartsPaletteServiceGetColor?: (value: string) => string | null);
    syncCircleColorWithMb(mbLayerId: string, mbMap: MbMap, alpha: unknown): void;
    syncIconColorWithMb(mbLayerId: string, mbMap: MbMap): void;
    syncHaloBorderColorWithMb(mbLayerId: string, mbMap: MbMap): void;
    syncCircleStrokeWithMb(pointLayerId: string, mbMap: MbMap, alpha: unknown): void;
    syncFillColorWithMb(mbLayerId: string, mbMap: MbMap, alpha: unknown): void;
    syncLineColorWithMb(mbLayerId: string, mbMap: MbMap, alpha: unknown): void;
    syncLabelColorWithMb(mbLayerId: string, mbMap: MbMap, alpha: unknown): void;
    syncLabelBorderColorWithMb(mbLayerId: string, mbMap: MbMap): void;
    supportsFieldMeta(): boolean;
    isOrdinal(): boolean;
    isCategorical(): boolean;
    getNumberOfCategories(): number;
    _getSupportedDataMappingFunctions(): DATA_MAPPING_FUNCTION[];
    _getMbColor(): string | (string | number | (string | number | (string | number | (string | string[] | null)[] | (string | number | (string | number | (string | string[])[])[])[])[])[])[] | (string | (string | string[])[] | null)[] | null;
    _getOrdinalColorMbExpression(): (string | number | (string | number | (string | number | (string | string[] | null)[] | (string | number | (string | number | (string | string[])[])[])[])[])[])[] | null;
    _getCustomRampColorStops(): Array<number | string>;
    _getOtherCategoryColor(): string | null;
    _getColorPaletteStops(): ({
        stop: string | null;
        color: string;
        isOtherCategory: boolean;
    } | {
        stop: string;
        color: string | null;
        isOtherCategory: boolean;
    })[];
    _getCategoricalColorMbExpression(): string | (string | (string | string[])[] | null)[] | null;
    _getOrdinalBreaks(symbolId?: string, svg?: string): Break[];
    _getCategoricalBreaks(symbolId?: string, svg?: string): Break[];
    renderLegendDetailRow({ isPointsOnly, isLinesOnly, symbolId, svg }: LegendProps): React.JSX.Element;
}
