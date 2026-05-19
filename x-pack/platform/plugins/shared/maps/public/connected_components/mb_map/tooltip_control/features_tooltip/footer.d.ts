import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import type { EuiSelectOption } from '@elastic/eui';
import type { TooltipFeature } from '../../../../../common/descriptor_types';
import type { IVectorLayer } from '../../../../classes/layers/vector_layer';
interface Props {
    features: TooltipFeature[];
    isLocked: boolean;
    findLayerById: (layerId: string) => IVectorLayer | undefined;
    setCurrentFeature: (feature: TooltipFeature) => void;
}
interface State {
    filteredFeatures: TooltipFeature[];
    pageNumber: number;
    selectedLayerId: string;
    layerOptions: EuiSelectOption[];
}
export declare class Footer extends Component<Props, State> {
    private _isMounted;
    private _prevFeatures;
    state: State;
    componentDidMount(): void;
    componentDidUpdate(): void;
    componentWillUnmount(): void;
    _loadUniqueLayers: () => Promise<void>;
    _onPageChange: (pageNumber: number) => void;
    _onLayerChange: (e: ChangeEvent<HTMLSelectElement>) => void;
    render(): React.JSX.Element | null;
}
export {};
