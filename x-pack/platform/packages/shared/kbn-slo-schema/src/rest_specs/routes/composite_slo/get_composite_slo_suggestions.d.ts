export interface GetCompositeSLOSuggestionsResponse {
    tags: Array<{
        label: string;
        value: string;
        count: number;
    }>;
}
