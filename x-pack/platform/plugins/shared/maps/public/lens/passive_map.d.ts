import React from 'react';
import type { LayerDescriptor } from '../../common/descriptor_types';
export interface Props {
    passiveLayer: LayerDescriptor;
    onRenderComplete?: () => void;
}
export declare function PassiveMap(props: Props): React.JSX.Element;
