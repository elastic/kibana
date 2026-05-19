import React from 'react';
interface Props {
    applyForceRefresh: boolean;
    setApplyForceRefresh: (applyGlobalTime: boolean) => void;
}
export declare function ForceRefreshCheckbox({ applyForceRefresh, setApplyForceRefresh }: Props): React.JSX.Element;
export {};
