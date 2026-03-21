export declare const progressMessages: {
    selectingTarget: () => string;
    resolvingSearchStrategy: ({ target }: {
        target: string;
    }) => string;
    performingRelevanceSearch: ({ term }: {
        term: string;
    }) => string;
    performingNlSearch: ({ query }: {
        query: string;
    }) => string;
};
