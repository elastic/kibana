import React from 'react';
interface Props {
    applyGlobalTime: boolean;
    label: string;
    setApplyGlobalTime: (applyGlobalTime: boolean) => void;
    isFeatureEditorOpenForLayer?: boolean;
}
export declare function GlobalTimeCheckbox({ applyGlobalTime, label, setApplyGlobalTime, isFeatureEditorOpenForLayer, }: Props): React.JSX.Element;
export {};
