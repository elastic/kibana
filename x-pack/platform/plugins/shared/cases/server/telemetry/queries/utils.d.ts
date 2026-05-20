import type { KueryNode } from '@kbn/es-query';
import type { CaseAggregationResult, Buckets, MaxBucketOnCaseAggregation, SolutionTelemetry, AttachmentFramework, AttachmentAggregationResult, FileAttachmentAggregationResults, FileAttachmentAggsResult, AttachmentFrameworkAggsResult, CustomFieldsTelemetry, AlertBuckets, CasesTelemetryWithAlertsAggsByOwnerResults, ObservablesAggregationResult, ObservablesTelemetry, TotalWithMaxObservablesAggregationResult } from '../types';
import type { Owner } from '../../../common/constants/types';
import type { ConfigurationPersistedAttributes } from '../../common/types/configure';
import type { TelemetrySavedObjectsClient } from '../telemetry_saved_objects_client';
export declare const getCountsAggregationQuery: (savedObjectType: string) => {
    counts: {
        date_range: {
            field: string;
            format: string;
            ranges: {
                from: string;
                to: string;
            }[];
        };
    };
};
export declare const getAlertsCountsAggregationQuery: () => {
    counts: {
        date_range: {
            field: string;
            format: string;
            ranges: {
                from: string;
                to: string;
            }[];
        };
        aggregations: {
            topAlertsPerBucket: {
                cardinality: {
                    field: string;
                };
            };
        };
    };
};
export declare const getMaxBucketOnCaseAggregationQuery: (savedObjectType: string) => {
    references: {
        nested: {
            path: string;
        };
        aggregations: {
            cases: {
                filter: {
                    term: {
                        [x: string]: "cases";
                    };
                };
                aggregations: {
                    ids: {
                        terms: {
                            field: string;
                        };
                    };
                    max: {
                        max_bucket: {
                            buckets_path: string;
                        };
                    };
                };
            };
        };
    };
};
export declare const getAlertsMaxBucketOnCaseAggregationQuery: () => {
    references: {
        nested: {
            path: string;
        };
        aggregations: {
            cases: {
                filter: {
                    term: {
                        [x: string]: "cases";
                    };
                };
                aggregations: {
                    ids: {
                        terms: {
                            field: string;
                        };
                        aggregations: {
                            reverse: {
                                reverse_nested: {};
                                aggregations: {
                                    topAlerts: {
                                        cardinality: {
                                            field: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    max: {
                        max_bucket: {
                            buckets_path: string;
                        };
                    };
                };
            };
        };
    };
};
export declare const getUniqueAlertCommentsCountQuery: () => {
    uniqueAlertCommentsCount: {
        cardinality: {
            field: string;
        };
    };
};
export declare const getReferencesAggregationQuery: ({ savedObjectType, referenceType, agg, }: {
    savedObjectType: string;
    referenceType: string;
    agg?: string;
}) => {
    references: {
        nested: {
            path: string;
        };
        aggregations: {
            referenceType: {
                filter: {
                    term: {
                        [x: string]: string;
                    };
                };
                aggregations: {
                    referenceAgg: {
                        [x: string]: {
                            field: string;
                        };
                    };
                };
            };
        };
    };
};
export declare const getConnectorsCardinalityAggregationQuery: () => {
    references: {
        nested: {
            path: string;
        };
        aggregations: {
            referenceType: {
                filter: {
                    term: {
                        [x: string]: string;
                    };
                };
                aggregations: {
                    referenceAgg: {
                        [x: string]: {
                            field: string;
                        };
                    };
                };
            };
        };
    };
};
export declare const getCountsFromBuckets: (buckets: Buckets["buckets"]) => {
    daily: number;
    weekly: number;
    monthly: number;
};
export declare const getAlertsCountsFromBuckets: (buckets: AlertBuckets["buckets"]) => {
    daily: number;
    weekly: number;
    monthly: number;
};
export declare const getObservablesTotalsByType: (observablesAggs?: ObservablesAggregationResult) => ObservablesTelemetry;
export declare const getTotalWithMaxObservables: (totalWithMaxObservablesAgg?: TotalWithMaxObservablesAggregationResult["buckets"]) => number;
interface CountsAndMaxAlertsAggRes {
    by_owner: {
        buckets: Array<{
            key: string;
            doc_count: number;
            counts: AlertBuckets;
            references: MaxBucketOnCaseAggregation['references'];
            uniqueAlertCommentsCount: {
                value: number;
            };
        }>;
    };
}
export declare const getCountsAndMaxAlertsData: ({ savedObjectsClient, }: {
    savedObjectsClient: TelemetrySavedObjectsClient;
}) => Promise<{
    all: {
        total: number;
        daily: number;
        weekly: number;
        monthly: number;
        maxOnACase: number;
    };
    sec: {
        total: number;
        daily: number;
        weekly: number;
        monthly: number;
        maxOnACase: number;
    };
    obs: {
        total: number;
        daily: number;
        weekly: number;
        monthly: number;
        maxOnACase: number;
    };
    main: {
        total: number;
        daily: number;
        weekly: number;
        monthly: number;
        maxOnACase: number;
    };
}>;
export declare const getSolutionStats: (owner: Owner, countsAndMaxAlertsAggRes?: CountsAndMaxAlertsAggRes) => {
    total: number;
    daily: number;
    weekly: number;
    monthly: number;
    maxOnACase: number;
};
export declare const getTotalStats: (countsAndMaxAlertsAggRes?: CountsAndMaxAlertsAggRes) => {
    total: number;
    daily: number;
    weekly: number;
    monthly: number;
    maxOnACase: number;
};
export declare const getCountsAndMaxData: ({ savedObjectsClient, savedObjectType, filter, }: {
    savedObjectsClient: TelemetrySavedObjectsClient;
    savedObjectType: string;
    filter?: KueryNode;
}) => Promise<{
    all: {
        maxOnACase: number;
        daily: number;
        weekly: number;
        monthly: number;
        total: number;
    };
}>;
export declare const getBucketFromAggregation: ({ aggs, key, }: {
    key: string;
    aggs?: Record<string, unknown>;
}) => Buckets["buckets"];
export declare const getSolutionValues: ({ caseAggregations, attachmentAggregations, filesAggregations, casesTotalWithAlerts, owner, }: {
    caseAggregations?: CaseAggregationResult;
    attachmentAggregations?: AttachmentAggregationResult;
    filesAggregations?: FileAttachmentAggregationResults;
    casesTotalWithAlerts?: CasesTelemetryWithAlertsAggsByOwnerResults;
    owner: Owner;
}) => SolutionTelemetry;
export declare const getCustomFieldsTelemetry: (customFields?: ConfigurationPersistedAttributes["customFields"]) => CustomFieldsTelemetry;
export declare const findValueInBuckets: (buckets: Buckets["buckets"], value: string | number) => number;
export declare const getAggregationsBuckets: ({ aggs, keys, }: {
    keys: string[];
    aggs?: Record<string, unknown>;
}) => Record<string, import("../types").Bucket<string | number>[]>;
export declare const getAttachmentsFrameworkStats: ({ attachmentAggregations, filesAggregations, totalCasesForOwner, }: {
    attachmentAggregations?: AttachmentFrameworkAggsResult;
    filesAggregations?: FileAttachmentAggsResult;
    totalCasesForOwner: number;
}) => AttachmentFramework;
export declare const getOnlyAlertsCommentsFilter: () => KueryNode | undefined;
export declare const getOnlyConnectorsFilter: () => KueryNode | undefined;
export declare const processWithAlertsByOwner: (aggregations?: CasesTelemetryWithAlertsAggsByOwnerResults) => Record<Owner, number>;
export {};
