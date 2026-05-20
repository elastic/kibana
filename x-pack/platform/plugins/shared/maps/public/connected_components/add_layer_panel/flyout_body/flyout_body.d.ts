import React from 'react';
import type { LayerWizard, RenderWizardArguments } from '../../../classes/layers';
type Props = RenderWizardArguments & {
    layerWizard: LayerWizard | null;
    onClear: () => void;
    onWizardSelect: (layerWizard: LayerWizard) => void;
    showBackButton: boolean;
};
export declare const FlyoutBody: (props: Props) => React.JSX.Element;
export {};
