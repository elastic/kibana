export declare function useFocusUpdate(ids: string[]): {
    setNextFocusedId: import("react").Dispatch<import("react").SetStateAction<string | null>>;
    removeRef: (id: string) => void;
    registerNewRef: (id: string, el: HTMLElement | null) => void;
};
