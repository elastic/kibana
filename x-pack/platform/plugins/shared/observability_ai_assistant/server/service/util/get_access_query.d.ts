export declare function getAccessQuery({ user, namespace, }: {
    user?: {
        name: string;
        id?: string;
    };
    namespace?: string;
}): {
    bool: {
        filter: ({
            bool: {
                should: ({
                    term: {
                        'user.id': string;
                    };
                    bool?: undefined;
                } | {
                    bool: {
                        must_not: {
                            exists: {
                                field: string;
                            };
                        };
                        must: {
                            term: {
                                'user.name': string;
                            };
                        };
                    };
                    term?: undefined;
                } | {
                    term: {
                        'user.name': string;
                    };
                } | {
                    term: {
                        public: boolean;
                    };
                })[];
                minimum_should_match: number;
            };
        } | {
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
                minimum_should_match?: undefined;
            };
        })[];
    };
}[];
export declare function getUserAccessFilters(user?: {
    name: string;
    id?: string;
}): ({
    term: {
        'user.id': string;
    };
    bool?: undefined;
} | {
    bool: {
        must_not: {
            exists: {
                field: string;
            };
        };
        must: {
            term: {
                'user.name': string;
            };
        };
    };
    term?: undefined;
})[] | {
    term: {
        'user.name': string;
    };
}[];
