export interface QuickFiltersProps {
    matcher: string;
    onChange: (matcher: string) => void;
}
export declare const POPOVER_PANEL_STYLE: {
    maxWidth: number;
};
/**
 * Action policies only target alert-kind rules, so the quick filters restrict
 * the rules and tags they surface to `kind: 'alert'`.
 */
export declare const ALERT_KIND_FILTER = "kind:alert";
export declare const SELECTABLE_LIST_PROPS: {
    isVirtualized: false;
    textWrap: "wrap";
    bordered: boolean;
    showIcons: boolean;
};
