import React from 'react';
import type { IVectorLayer } from '../../../classes/layers/vector_layer';
import type { JoinDescriptor } from '../../../../common/descriptor_types';
export interface JoinField {
    label: string;
    name: string;
}
export interface Props {
    joins: Array<Partial<JoinDescriptor>>;
    layer: IVectorLayer;
    layerDisplayName: string;
    leftJoinFields: JoinField[];
    onChange: (layer: IVectorLayer, joins: Array<Partial<JoinDescriptor>>) => void;
}
export declare function JoinEditor({ joins, layer, onChange, leftJoinFields, layerDisplayName }: Props): React.JSX.Element;
