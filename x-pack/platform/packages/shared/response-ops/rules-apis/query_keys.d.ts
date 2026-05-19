export declare const queryKeys: {
    root: string;
    getRuleTags: ({ ruleTypeIds, search, perPage, page, refresh, }: {
        ruleTypeIds?: string[];
        search?: string;
        perPage?: number;
        page: number;
        refresh?: Date;
    }) => readonly [string, "getRuleTags", string[] | undefined, string | undefined, number | undefined, number, {
        readonly refresh: string | undefined;
    }];
    getRuleTypes: () => readonly [string, "getRuleTypes"];
    getInternalRuleTypes: () => readonly [string, "getInternalRuleTypes"];
};
