export declare const UPDATE_TAGS_SCRIPT: string;
export declare const getBulkUpdateTagsPainlessScript: (add?: string[] | null, remove?: string[] | null) => {
    source: string;
    lang: string;
    params: {
        add: string[];
        remove: string[];
    };
};
