import type { ReactNode } from 'react';
import React, { Component } from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import { SCALING_TYPES } from '../../../../../common/constants';
import type { OnSourceChangeArgs } from '../../source';
interface Props {
    filterByMapBounds: boolean;
    indexPatternId: string;
    onChange: (args: OnSourceChangeArgs) => void;
    scalingType: SCALING_TYPES;
    supportsClustering: boolean;
    clusteringDisabledReason?: string | null;
    hasSpatialJoins: boolean;
    numberOfJoins: number;
}
interface State {
    nextScalingType?: SCALING_TYPES;
    maxResultWindow: string;
    showModal: boolean;
    modalContent: ReactNode;
}
export declare class ScalingForm extends Component<Props, State> {
    state: State;
    _isMounted: boolean;
    componentDidMount(): void;
    componentWillUnmount(): void;
    loadIndexSettings(): Promise<void>;
    _onScalingTypeSelect: (optionId: SCALING_TYPES) => void;
    _onScalingTypeChange: (optionId: SCALING_TYPES) => void;
    _onFilterByMapBoundsChange: (event: EuiSwitchEvent) => void;
    _openModal: (optionId: SCALING_TYPES, messages: string[]) => void;
    _closeModal: () => void;
    _acceptModal: () => void;
    _getLimitOptionLabel(): string;
    _getClustersOptionLabel(): string;
    _getMvtOptionLabel(): string;
    _renderModal(): React.JSX.Element | null;
    _renderClusteringRadio(): React.JSX.Element;
    render(): React.JSX.Element;
}
export {};
