export declare const SELECTOR_LIST_HEADER_HEIGHT = 57;
export declare const SELECTOR_LIST_FOOTER_HEIGHT = 57;
export declare const getMaxListHeight: ({ withHeader, withFooter, }: {
    withHeader?: boolean;
    withFooter?: boolean;
}) => number;
export declare const selectorPopoverPanelStyles: import("@emotion/react").SerializedStyles;
export declare const useSelectorListStyles: ({ listId }: {
    listId: string;
}) => import("@emotion/react").SerializedStyles[];
