import React from 'react';
import type { DatasourceLayerPanelProps, FormBasedPrivateState } from '@kbn/lens-common';
export interface FormBasedLayerPanelProps extends DatasourceLayerPanelProps<FormBasedPrivateState> {
    state: FormBasedPrivateState;
    onChangeIndexPattern: (newId: string) => void;
}
export declare function LayerPanel({ state, layerId, onChangeIndexPattern, dataViews, }: FormBasedLayerPanelProps): React.JSX.Element;
