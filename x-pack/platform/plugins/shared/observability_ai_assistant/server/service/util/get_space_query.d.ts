export declare function getSpaceQuery({ namespace }: {
    namespace?: string;
}): {
    bool: {
        should: ({
            term: {
                namespace: string | undefined;
            };
            bool?: undefined;
        } | {
            bool: {
                must_not: {
                    exists: {
                        field: string;
                    };
                };
            };
            term?: undefined;
        })[];
    };
}[];
