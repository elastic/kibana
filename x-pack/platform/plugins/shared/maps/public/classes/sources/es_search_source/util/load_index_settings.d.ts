export interface INDEX_SETTINGS {
    maxResultWindow: number;
    maxInnerResultWindow: number;
}
export declare function loadIndexSettings(indexPatternTitle: string): Promise<INDEX_SETTINGS>;
