import React from 'react';
import type { IStyle } from '../style';
import type { EMSVectorTileStyleDescriptor, StyleDescriptor } from '../../../../common/descriptor_types';
import { LAYER_STYLE_TYPE } from '../../../../common/constants';
export declare class EMSVectorTileStyle implements IStyle {
    readonly _descriptor: EMSVectorTileStyleDescriptor;
    constructor(descriptor?: {
        color: string;
    });
    static createDescriptor(color?: string): EMSVectorTileStyleDescriptor;
    getType(): LAYER_STYLE_TYPE;
    getColor(): string;
    renderEditor(onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void): React.JSX.Element;
}
