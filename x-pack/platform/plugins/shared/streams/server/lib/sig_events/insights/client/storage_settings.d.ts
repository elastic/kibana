export declare const insightStorageSettings: {
    name: string;
    schema: {
        properties: {
            id: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            title: import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingTextProperty>;
            description: import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingTextProperty>;
            impact: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            impact_level: import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingLongNumberProperty>;
            generated_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingDateProperty>;
            user_evaluation: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            evidence: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                enabled: false;
            };
            recommendations: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                enabled: false;
            };
        };
    };
};
export type InsightStorageSettings = typeof insightStorageSettings;
