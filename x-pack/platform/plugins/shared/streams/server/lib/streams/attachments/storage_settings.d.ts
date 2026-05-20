export declare const STREAM_NAMES = "stream.names";
export declare const ATTACHMENT_UUID = "attachment.uuid";
export declare const ATTACHMENT_ID = "attachment.id";
export declare const ATTACHMENT_TYPE = "attachment.type";
export declare const attachmentStorageSettings: {
    name: string;
    schema: {
        properties: {
            "attachment.uuid": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "attachment.id": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "attachment.type": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
            "stream.names": import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            } & Partial<import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty>;
        };
    };
};
export type AttachmentStorageSettings = typeof attachmentStorageSettings;
