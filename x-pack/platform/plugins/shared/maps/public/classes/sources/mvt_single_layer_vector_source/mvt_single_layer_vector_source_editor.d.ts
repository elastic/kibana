import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import _ from 'lodash';
import type { MVTFieldDescriptor, TiledSingleLayerVectorSourceDescriptor } from '../../../../common/descriptor_types';
export type TiledSingleLayerVectorSourceSettings = Omit<TiledSingleLayerVectorSourceDescriptor, 'tooltipProperties' | 'type'>;
interface Props {
    onSourceConfigChange: (sourceConfig: TiledSingleLayerVectorSourceSettings) => void;
}
interface State {
    urlTemplate: string;
    layerName: string;
    minSourceZoom: number;
    maxSourceZoom: number;
    fields?: MVTFieldDescriptor[];
}
export declare class MVTSingleLayerVectorSourceEditor extends Component<Props, State> {
    state: {
        urlTemplate: string;
        layerName: string;
        minSourceZoom: number;
        maxSourceZoom: number;
        fields: never[];
    };
    _sourceConfigChange: _.DebouncedFunc<() => void>;
    _handleUrlTemplateChange: (e: ChangeEvent<HTMLInputElement>) => void;
    _handleChange: (state: {
        layerName: string;
        fields: MVTFieldDescriptor[];
        minSourceZoom: number;
        maxSourceZoom: number;
    }) => void;
    render(): React.JSX.Element;
}
export {};
