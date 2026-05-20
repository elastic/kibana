export declare const useIsUserTyping: () => {
    isUserTyping: boolean;
    setIsUserTyping: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    onDebounce: () => void;
    onContentChange: (value: string) => void;
};
export type UseIsUserTyping = ReturnType<typeof useIsUserTyping>;
