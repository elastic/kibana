import React from 'react';
interface FlyoutStateContextValue {
    isFlyoutOpen: boolean;
}
interface FlyoutStateProviderProps {
    children: React.ReactNode;
    isFlyoutOpen: boolean;
}
export declare function ObservabilityAIAssistantFlyoutStateProvider({ children, isFlyoutOpen, }: FlyoutStateProviderProps): React.JSX.Element;
export declare function useObservabilityAIAssistantFlyoutStateContext(): FlyoutStateContextValue;
export {};
