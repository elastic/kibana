export declare function getCategoryQuery({ categories }: {
    categories?: string[];
}): {
    bool: {
        must_not: {
            exists: {
                field: string;
            };
        };
    };
}[] | {
    bool: {
        should: ({
            bool: {
                must_not: {
                    exists: {
                        field: string;
                    };
                };
            };
        } | {
            terms: {
                'labels.category.keyword': string[];
            };
        })[];
        minimum_should_match: number;
    };
}[];
