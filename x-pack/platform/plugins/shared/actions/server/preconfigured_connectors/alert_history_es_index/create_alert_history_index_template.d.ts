import type { ElasticsearchClient, Logger } from '@kbn/core/server';
export declare function getAlertHistoryIndexTemplate(): {
    index_patterns: string[];
    _meta: {
        description: string;
    };
    template: {
        settings: {
            number_of_shards: number;
            auto_expand_replicas: string;
        };
        mappings: {
            dynamic: string;
            properties: {
                "@timestamp": {
                    type: string;
                };
                kibana: {
                    properties: {
                        alert: {
                            properties: {
                                actionGroup: {
                                    type: string;
                                };
                                actionGroupName: {
                                    type: string;
                                };
                                actionSubgroup: {
                                    type: string;
                                };
                                context: {
                                    type: string;
                                    enabled: boolean;
                                };
                                id: {
                                    type: string;
                                };
                            };
                        };
                    };
                };
                tags: {
                    ignore_above: number;
                    type: string;
                    meta: {
                        isArray: string;
                    };
                };
                message: {
                    norms: boolean;
                    type: string;
                };
                event: {
                    properties: {
                        kind: {
                            type: string;
                        };
                    };
                };
                rule: {
                    properties: {
                        author: {
                            type: string;
                        };
                        category: {
                            type: string;
                        };
                        id: {
                            type: string;
                        };
                        license: {
                            type: string;
                        };
                        name: {
                            type: string;
                            fields: {
                                keyword: {
                                    type: string;
                                };
                            };
                        };
                        params: {
                            type: string;
                            enabled: boolean;
                        };
                        space: {
                            type: string;
                        };
                        type: {
                            type: string;
                        };
                    };
                };
            };
        };
    };
};
export declare function createAlertHistoryIndexTemplate({ client, logger, }: {
    client: ElasticsearchClient;
    logger: Logger;
}): Promise<void>;
