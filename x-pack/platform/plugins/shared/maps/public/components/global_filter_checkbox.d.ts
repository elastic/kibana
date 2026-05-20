import React from 'react';
interface Props {
    applyGlobalQuery: boolean;
    label: string;
    setApplyGlobalQuery: (applyGlobalQuery: boolean) => void;
    isFeatureEditorOpenForLayer?: boolean;
}
export declare function GlobalFilterCheckbox({ applyGlobalQuery, label, setApplyGlobalQuery, isFeatureEditorOpenForLayer, }: Props): React.JSX.Element;
export {};
