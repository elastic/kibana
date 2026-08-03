import type { ReactElement, ReactNode, FunctionComponent } from 'react';
import type { LayerDescriptor } from '../../../../common/descriptor_types';
import type { LAYER_WIZARD_CATEGORY } from '../../../../common/constants';
export type RenderSecondaryActionButtonProps = {
    isDisabled: boolean;
    isLoading: boolean;
    addLayersAndClose: () => void;
};
export type LayerWizardStep = {
    id: string;
    label: string;
    nextButtonLabel?: string;
    renderSecondaryActionButton?: (props: RenderSecondaryActionButtonProps) => ReactNode;
};
export type LayerWizard = {
    id: string;
    title: string;
    categories: LAYER_WIZARD_CATEGORY[];
    order: number;
    description: string;
    icon: string | FunctionComponent<any>;
    renderWizard(renderWizardArguments: RenderWizardArguments): ReactElement<any>;
    prerequisiteSteps?: LayerWizardStep[];
    disabledReason?: string;
    getIsDisabled?: () => Promise<boolean> | boolean;
    isBeta?: boolean;
    checkVisibility?: () => Promise<boolean>;
    showFeatureEditTools?: boolean;
};
export type RenderWizardArguments = {
    previewLayers: (layerDescriptors: LayerDescriptor[]) => void;
    mapColors: string[];
    mostCommonDataViewId?: string;
    currentStepId: string | null;
    isOnFinalStep: boolean;
    enableNextBtn: () => void;
    disableNextBtn: () => void;
    startStepLoading: () => void;
    stopStepLoading: () => void;
    advanceToNextStep: () => void;
};
export type LayerWizardWithMeta = LayerWizard & {
    isVisible: boolean;
    isDisabled: boolean;
};
export declare function registerLayerWizardInternal(layerWizard: LayerWizard): void;
export declare function registerLayerWizardExternal(layerWizard: LayerWizard): void;
export declare function getLayerWizards(): Promise<LayerWizardWithMeta[]>;
export declare function getWizardById(wizardId: string): LayerWizard | undefined;
