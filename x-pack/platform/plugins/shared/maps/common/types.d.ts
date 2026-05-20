export interface CreateDocSourceResp {
    indexPatternId?: string;
    success: boolean;
    error?: Error;
}
export interface MatchingIndexesResp {
    matchingIndexes?: string[];
    success: boolean;
    error?: Error;
}
export interface WriteSettings {
    index: string;
    body: object;
    [key: string]: any;
}
