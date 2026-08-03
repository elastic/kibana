export interface SmlMenuHighlightSearchStrings {
    readonly type: string;
    readonly title: string;
}
/**
 * Builds `search` props for two {@link @elastic/eui#EuiHighlight} instances
 * from the raw SML menu query (`type/title`).
 */
export declare const getSmlMenuHighlightSearchStrings: (rawQuery: string) => SmlMenuHighlightSearchStrings;
