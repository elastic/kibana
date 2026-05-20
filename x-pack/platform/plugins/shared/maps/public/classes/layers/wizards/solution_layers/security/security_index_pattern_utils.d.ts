export type IndexPatternMeta = {
    id: string;
    title: string;
};
export declare function getSecurityIndexPatterns(): Promise<IndexPatternMeta[]>;
