import React from 'react';
import type { CustomIcon, StyleDescriptor } from '../../../../common/descriptor_types';
import type { ILayer } from '../../../classes/layers/layer';
export interface Props {
    layer: ILayer;
    updateStyleDescriptor: (styleDescriptor: StyleDescriptor) => void;
    updateCustomIcons: (customIcons: CustomIcon[]) => void;
}
export declare function StyleSettings({ layer, updateStyleDescriptor, updateCustomIcons }: Props): React.JSX.Element | null;
