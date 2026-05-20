import React from 'react';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import type { IStyle } from '../style';
import { LAYER_STYLE_TYPE, GRID_RESOLUTION } from '../../../../common/constants';
import type { HeatmapStyleDescriptor, StyleDescriptor } from '../../../../common/descriptor_types';
import type { IField } from '../../fields/field';
export declare class HeatmapStyle implements IStyle {
    readonly _descriptor: Required<HeatmapStyleDescriptor>;
    constructor(descriptor?: {
        colorRampName?: HeatmapStyleDescriptor['colorRampName'];
    });
    static createDescriptor(colorRampName?: HeatmapStyleDescriptor['colorRampName']): Required<HeatmapStyleDescriptor>;
    getType(): LAYER_STYLE_TYPE;
    renderEditor(onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void): React.JSX.Element;
    renderLegendDetails(field: IField): React.JSX.Element;
    getIcon(): React.JSX.Element;
    setMBPaintProperties({ mbMap, layerId, propertyName, max, resolution, }: {
        mbMap: MbMap;
        layerId: string;
        propertyName: string;
        max: number;
        resolution: GRID_RESOLUTION;
    }): void;
}
