import React, { Component } from 'react';
import type { EuiRangeProps } from '@elastic/eui';
import type { AggDescriptor } from '../../../../common/descriptor_types';
import { GRID_RESOLUTION, RENDER_AS } from '../../../../common/constants';
interface Props {
    renderAs: RENDER_AS;
    resolution: GRID_RESOLUTION;
    onChange: (resolution: GRID_RESOLUTION, metrics: AggDescriptor[]) => void;
    metrics: AggDescriptor[];
}
interface State {
    showModal: boolean;
}
export declare class ResolutionEditor extends Component<Props, State> {
    state: State;
    _getScale(): {
        SUPER_FINE: number;
        MOST_FINE: number;
        FINE: number;
        COARSE: number;
    };
    _getTicks(): ({
        label: React.JSX.Element;
        value: number;
    } | {
        label: string;
        value: number;
    })[];
    _resolutionToSliderValue(resolution: GRID_RESOLUTION): number;
    _sliderValueToResolution(value: number): GRID_RESOLUTION;
    _onResolutionChange: EuiRangeProps['onChange'];
    _closeModal: () => void;
    _acceptModal: () => void;
    _renderModal(): React.JSX.Element | null;
    render(): React.JSX.Element;
}
export {};
