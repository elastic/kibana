import React from 'react';
import type { ILayer } from '../classes/layers/layer';
export interface Props {
    layer: ILayer;
    onCancel: () => void;
    onConfirm: () => void;
}
export declare function RemoveLayerConfirmModal(props: Props): React.JSX.Element;
