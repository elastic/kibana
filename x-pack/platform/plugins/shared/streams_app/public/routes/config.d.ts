import * as t from 'io-ts';
import React from 'react';
/**
 * The array of route definitions to be used when the application
 * creates the routes.
 *
 * Query params (rangeFrom/rangeTo) are optional - navigation calls can omit them
 * and DateRangeRedirect will ensure they're populated from the global timefilter.
 */
declare const streamsAppRoutes: {
    '/': {
        element: React.JSX.Element;
        children: {
            '/': {
                element: React.JSX.Element;
                params: t.PartialC<{
                    query: t.PartialC<{
                        rangeFrom: t.StringC;
                        rangeTo: t.StringC;
                    }>;
                }>;
            };
            '/data-sources': {
                element: React.JSX.Element;
                params: t.PartialC<{
                    query: t.PartialC<{
                        rangeFrom: t.StringC;
                        rangeTo: t.StringC;
                    }>;
                }>;
            };
            '/_discovery': {
                element: React.JSX.Element;
                children: {
                    '/_discovery': {
                        element: React.JSX.Element;
                    };
                    '/_discovery/{tab}': {
                        element: React.JSX.Element;
                        params: t.IntersectionC<[t.TypeC<{
                            path: t.TypeC<{
                                tab: t.StringC;
                            }>;
                        }>, t.PartialC<{
                            query: t.PartialC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                            }>;
                        }>]>;
                    };
                };
            };
            '/{key}': {
                element: React.JSX.Element;
                params: t.IntersectionC<[t.TypeC<{
                    path: t.TypeC<{
                        key: t.StringC;
                    }>;
                }>, t.PartialC<{
                    query: t.PartialC<{
                        rangeFrom: t.StringC;
                        rangeTo: t.StringC;
                    }>;
                }>]>;
                children: {
                    '/{key}': {
                        element: React.JSX.Element;
                    };
                    /**
                     * This route redirects from legacy overview/dashboard links to the management page
                     */
                    '/{key}/{tab}': {
                        element: React.JSX.Element;
                        params: t.IntersectionC<[t.TypeC<{
                            path: t.TypeC<{
                                tab: t.StringC;
                            }>;
                        }>, t.PartialC<{
                            query: t.PartialC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                            }>;
                        }>]>;
                    };
                    '/{key}/management/{tab}': {
                        element: React.JSX.Element;
                        params: t.IntersectionC<[t.TypeC<{
                            path: t.TypeC<{
                                tab: t.StringC;
                            }>;
                        }>, t.PartialC<{
                            query: t.PartialC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                                openFlyout: t.StringC;
                                pageState: t.StringC;
                            }>;
                        }>]>;
                    };
                    /**
                     * This route is added as a catch-all route to redirect to the retention tab in case of a
                     * invalid subtab or a missing subtab.
                     * Works on more in-depth routes as well, e.g. /{key}/management/{tab}/{subtab}/random-path.
                     */
                    '/*': {
                        element: React.JSX.Element;
                    };
                };
            };
        };
    };
};
export type StreamsAppRoutes = typeof streamsAppRoutes;
export declare const streamsAppRouter: import("@kbn/typed-react-router-config").Router<{
    '/': {
        element: React.JSX.Element;
        children: {
            '/': {
                element: React.JSX.Element;
                params: t.PartialC<{
                    query: t.PartialC<{
                        rangeFrom: t.StringC;
                        rangeTo: t.StringC;
                    }>;
                }>;
            };
            '/data-sources': {
                element: React.JSX.Element;
                params: t.PartialC<{
                    query: t.PartialC<{
                        rangeFrom: t.StringC;
                        rangeTo: t.StringC;
                    }>;
                }>;
            };
            '/_discovery': {
                element: React.JSX.Element;
                children: {
                    '/_discovery': {
                        element: React.JSX.Element;
                    };
                    '/_discovery/{tab}': {
                        element: React.JSX.Element;
                        params: t.IntersectionC<[t.TypeC<{
                            path: t.TypeC<{
                                tab: t.StringC;
                            }>;
                        }>, t.PartialC<{
                            query: t.PartialC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                            }>;
                        }>]>;
                    };
                };
            };
            '/{key}': {
                element: React.JSX.Element;
                params: t.IntersectionC<[t.TypeC<{
                    path: t.TypeC<{
                        key: t.StringC;
                    }>;
                }>, t.PartialC<{
                    query: t.PartialC<{
                        rangeFrom: t.StringC;
                        rangeTo: t.StringC;
                    }>;
                }>]>;
                children: {
                    '/{key}': {
                        element: React.JSX.Element;
                    };
                    /**
                     * This route redirects from legacy overview/dashboard links to the management page
                     */
                    '/{key}/{tab}': {
                        element: React.JSX.Element;
                        params: t.IntersectionC<[t.TypeC<{
                            path: t.TypeC<{
                                tab: t.StringC;
                            }>;
                        }>, t.PartialC<{
                            query: t.PartialC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                            }>;
                        }>]>;
                    };
                    '/{key}/management/{tab}': {
                        element: React.JSX.Element;
                        params: t.IntersectionC<[t.TypeC<{
                            path: t.TypeC<{
                                tab: t.StringC;
                            }>;
                        }>, t.PartialC<{
                            query: t.PartialC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                                openFlyout: t.StringC;
                                pageState: t.StringC;
                            }>;
                        }>]>;
                    };
                    /**
                     * This route is added as a catch-all route to redirect to the retention tab in case of a
                     * invalid subtab or a missing subtab.
                     * Works on more in-depth routes as well, e.g. /{key}/management/{tab}/{subtab}/random-path.
                     */
                    '/*': {
                        element: React.JSX.Element;
                    };
                };
            };
        };
    };
}>;
export type StreamsAppRouter = typeof streamsAppRouter;
export {};
