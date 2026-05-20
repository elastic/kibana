declare const connected: import("react-redux").ConnectedComponent<(props: import("../../..").RenderWizardArguments & {
    layerWizard: import("../../..").LayerWizard | null;
    onClear: () => void;
    onWizardSelect: (layerWizard: import("../../..").LayerWizard) => void;
    showBackButton: boolean;
}) => import("react").JSX.Element, import("react-redux").Omit<import("../../..").RenderWizardArguments & {
    layerWizard: import("../../..").LayerWizard | null;
    onClear: () => void;
    onWizardSelect: (layerWizard: import("../../..").LayerWizard) => void;
    showBackButton: boolean;
}, "mapColors" | "mostCommonDataViewId">>;
export { connected as FlyoutBody };
