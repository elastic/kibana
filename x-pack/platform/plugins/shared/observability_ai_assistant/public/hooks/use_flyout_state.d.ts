declare enum FlyoutPositionMode {
    PUSH = "push",
    OVERLAY = "overlay"
}
interface FlyoutState {
    flyoutPositionMode: FlyoutPositionMode;
    isOpen: boolean;
}
export declare const defaultFlyoutState: FlyoutState;
export declare const OBSERVABILITY_AI_ASSISTANT_LOCAL_STORAGE_KEY = "observabilityAIAssistant_flyoutState";
export declare function useFlyoutState(): {
    flyoutState: FlyoutState;
    setFlyoutState: import("react").Dispatch<import("react").SetStateAction<FlyoutState | undefined>>;
    removeFlyoutState: () => void;
};
export {};
