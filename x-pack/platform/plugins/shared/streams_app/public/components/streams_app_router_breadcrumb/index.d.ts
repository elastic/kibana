export declare const StreamsAppRouterBreadcrumb: import("@kbn/typed-react-router-config/src/breadcrumbs/breadcrumb").RouterBreadcrumb<{
    '/': {
        element: import("react").JSX.Element;
        children: {
            '/': {
                element: import("react").JSX.Element;
                params: import("io-ts").PartialC<{
                    query: import("io-ts").PartialC<{
                        rangeFrom: import("io-ts").StringC;
                        rangeTo: import("io-ts").StringC;
                    }>;
                }>;
            };
            '/data-sources': {
                element: import("react").JSX.Element;
                params: import("io-ts").PartialC<{
                    query: import("io-ts").PartialC<{
                        rangeFrom: import("io-ts").StringC;
                        rangeTo: import("io-ts").StringC;
                    }>;
                }>;
            };
            '/_discovery': {
                element: import("react").JSX.Element;
                children: {
                    '/_discovery': {
                        element: import("react").JSX.Element;
                    };
                    '/_discovery/{tab}': {
                        element: import("react").JSX.Element;
                        params: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                            path: import("io-ts").TypeC<{
                                tab: import("io-ts").StringC;
                            }>;
                        }>, import("io-ts").PartialC<{
                            query: import("io-ts").PartialC<{
                                rangeFrom: import("io-ts").StringC;
                                rangeTo: import("io-ts").StringC;
                            }>;
                        }>]>;
                    };
                };
            };
            '/{key}': {
                element: import("react").JSX.Element;
                params: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                    path: import("io-ts").TypeC<{
                        key: import("io-ts").StringC;
                    }>;
                }>, import("io-ts").PartialC<{
                    query: import("io-ts").PartialC<{
                        rangeFrom: import("io-ts").StringC;
                        rangeTo: import("io-ts").StringC;
                    }>;
                }>]>;
                children: {
                    '/{key}': {
                        element: import("react").JSX.Element;
                    };
                    '/{key}/{tab}': {
                        element: import("react").JSX.Element;
                        params: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                            path: import("io-ts").TypeC<{
                                tab: import("io-ts").StringC;
                            }>;
                        }>, import("io-ts").PartialC<{
                            query: import("io-ts").PartialC<{
                                rangeFrom: import("io-ts").StringC;
                                rangeTo: import("io-ts").StringC;
                            }>;
                        }>]>;
                    };
                    '/{key}/management/{tab}': {
                        element: import("react").JSX.Element;
                        params: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                            path: import("io-ts").TypeC<{
                                tab: import("io-ts").StringC;
                            }>;
                        }>, import("io-ts").PartialC<{
                            query: import("io-ts").PartialC<{
                                rangeFrom: import("io-ts").StringC;
                                rangeTo: import("io-ts").StringC;
                                openFlyout: import("io-ts").StringC;
                                pageState: import("io-ts").StringC;
                            }>;
                        }>]>;
                    };
                    '/*': {
                        element: import("react").JSX.Element;
                    };
                };
            };
        };
    };
}>;
