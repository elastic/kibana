import React, { Component } from 'react';
import type { LayerDescriptor } from '../../../common/descriptor_types';
import type { LayerWizard } from '../../classes/layers';
import { type LayerWizardStep } from '../../classes/layers/wizards/layer_wizard_registry';
export declare const ADD_LAYER_STEP_ID = "ADD_LAYER_STEP_ID";
export interface Props {
    addPreviewLayers: (layerDescriptors: LayerDescriptor[]) => void;
    closeFlyout: () => void;
    hasPreviewLayers: boolean;
    addLayersAndClose: () => void;
    addLayersAndContinue: () => void;
    enableEditMode: () => void;
    autoOpenLayerWizardId: string;
    clearAutoOpenLayerWizardId: () => void;
}
interface State {
    currentStepIndex: number;
    currentStep: LayerWizardStep | null;
    layerSteps: LayerWizardStep[] | null;
    layerWizard: LayerWizard | null;
    isNextStepBtnEnabled: boolean;
    isStepLoading: boolean;
}
export declare class AddLayerPanel extends Component<Props, State> {
    state: {
        currentStepIndex: number;
        currentStep: LayerWizardStep | null;
        layerSteps: LayerWizardStep[] | null;
        layerWizard: LayerWizard | null;
        isNextStepBtnEnabled: boolean;
        isStepLoading: boolean;
    };
    componentDidMount(): void;
    _openWizard(): void;
    _previewLayers: (layerDescriptors: LayerDescriptor[]) => void;
    _clearLayerWizard: () => void;
    _onWizardSelect: (layerWizard: LayerWizard) => void;
    _onNext: () => void;
    _enableNextBtn: () => void;
    _disableNextBtn: () => void;
    _startStepLoading: () => void;
    _stopStepLoading: () => void;
    _renderNextButton(): React.JSX.Element | null;
    render(): React.JSX.Element;
}
export {};
