export declare const searchTagsOASOperationObject: {
    responses: {
        200: {
            content: {
                'application/json': {
                    examples: {
                        searchTagsResponse: {
                            summary: string;
                            value: {
                                data: {
                                    id: string;
                                    data: {
                                        name: string;
                                        description: string;
                                        color: string;
                                    };
                                    meta: {
                                        created_at: string;
                                        updated_at: string;
                                        managed: false;
                                        version: string;
                                    };
                                }[];
                                meta: {
                                    page: number;
                                    per_page: number;
                                    total: number;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
};
export declare const createTagOASOperationObject: {
    requestBody: {
        content: {
            'application/json': {
                examples: {
                    createTagRequest: {
                        summary: string;
                        value: {
                            name: string;
                            description: string;
                            color: string;
                        };
                    };
                };
            };
        };
    };
    responses: {
        201: {
            content: {
                'application/json': {
                    examples: {
                        createTagResponse: {
                            summary: string;
                            value: {
                                id: string;
                                data: {
                                    name: string;
                                    description: string;
                                    color: string;
                                };
                                meta: {
                                    created_at: string;
                                    updated_at: string;
                                    managed: false;
                                    version: string;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
};
export declare const readTagOASOperationObject: {
    responses: {
        200: {
            content: {
                'application/json': {
                    examples: {
                        readTagResponse: {
                            summary: string;
                            value: {
                                id: string;
                                data: {
                                    name: string;
                                    description: string;
                                    color: string;
                                };
                                meta: {
                                    created_at: string;
                                    updated_at: string;
                                    managed: false;
                                    version: string;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
};
export declare const upsertTagOASOperationObject: {
    requestBody: {
        content: {
            'application/json': {
                examples: {
                    upsertTagRequest: {
                        summary: string;
                        value: {
                            name: string;
                            description: string;
                            color: string;
                        };
                    };
                };
            };
        };
    };
    responses: {
        200: {
            content: {
                'application/json': {
                    examples: {
                        updateTagResponse: {
                            summary: string;
                            value: {
                                id: string;
                                data: {
                                    name: string;
                                    description: string;
                                    color: string;
                                };
                                meta: {
                                    created_at: string;
                                    updated_at: string;
                                    managed: false;
                                    version: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        201: {
            content: {
                'application/json': {
                    examples: {
                        upsertTagCreatedResponse: {
                            summary: string;
                            value: {
                                id: string;
                                data: {
                                    name: string;
                                    description: string;
                                    color: string;
                                };
                                meta: {
                                    created_at: string;
                                    updated_at: string;
                                    managed: false;
                                    version: string;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
};
