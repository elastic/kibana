import { z } from '@kbn/zod/v4';
import type { Condition } from '../conditions';
import type { ElasticsearchProcessorType } from './manual_ingest_pipeline_processors';
import type { ConvertType } from '../formats/convert_types';
/**
 * Base processor
 */
export interface ProcessorBase {
    customIdentifier?: string;
    description?: string;
    ignore_failure?: boolean;
}
/**
 * Base with where
 */
export interface ProcessorBaseWithWhere extends ProcessorBase {
    where?: Condition;
}
export declare const processorBaseWithWhereSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
}, z.core.$strip>;
export type ElasticsearchProcessor = Partial<Record<ElasticsearchProcessorType, unknown>>;
export interface ManualIngestPipelineProcessor extends ProcessorBaseWithWhere {
    action: 'manual_ingest_pipeline';
    processors: ElasticsearchProcessor[];
    ignore_failure?: boolean;
    tag?: string;
    on_failure?: Array<Record<string, unknown>>;
}
export declare const manualIngestPipelineProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"manual_ingest_pipeline">;
    processors: z.ZodArray<z.ZodPipe<z.ZodRecord<z.ZodEnum<{
        remove: "remove";
        join: "join";
        sort: "sort";
        split: "split";
        trim: "trim";
        script: "script";
        circle: "circle";
        date: "date";
        bytes: "bytes";
        json: "json";
        geo_grid: "geo_grid";
        convert: "convert";
        set: "set";
        attachment: "attachment";
        enrich: "enrich";
        inference: "inference";
        fail: "fail";
        pipeline: "pipeline";
        append: "append";
        lowercase: "lowercase";
        uppercase: "uppercase";
        drop: "drop";
        cef: "cef";
        uri_parts: "uri_parts";
        user_agent: "user_agent";
        registered_domain: "registered_domain";
        rename: "rename";
        csv: "csv";
        fingerprint: "fingerprint";
        community_id: "community_id";
        date_index_name: "date_index_name";
        dissect: "dissect";
        dot_expander: "dot_expander";
        foreach: "foreach";
        ip_location: "ip_location";
        geoip: "geoip";
        grok: "grok";
        gsub: "gsub";
        html_strip: "html_strip";
        kv: "kv";
        network_direction: "network_direction";
        redact: "redact";
        reroute: "reroute";
        set_security_user: "set_security_user";
        terminate: "terminate";
        urldecode: "urldecode";
    }>, z.ZodUnknown>, z.ZodTransform<{
        [k: string]: unknown;
    }, Record<"remove" | "join" | "sort" | "split" | "trim" | "script" | "circle" | "date" | "bytes" | "json" | "geo_grid" | "convert" | "set" | "attachment" | "enrich" | "inference" | "fail" | "pipeline" | "append" | "lowercase" | "uppercase" | "drop" | "cef" | "uri_parts" | "user_agent" | "registered_domain" | "rename" | "csv" | "fingerprint" | "community_id" | "date_index_name" | "dissect" | "dot_expander" | "foreach" | "ip_location" | "geoip" | "grok" | "gsub" | "html_strip" | "kv" | "network_direction" | "redact" | "reroute" | "set_security_user" | "terminate" | "urldecode", unknown>>>>;
    tag: z.ZodOptional<z.ZodString>;
    on_failure: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, z.core.$strip>;
/**
 * Grok processor
 */
export interface GrokProcessor extends ProcessorBaseWithWhere {
    action: 'grok';
    from: string;
    patterns: string[];
    pattern_definitions?: Record<string, string>;
    ignore_missing?: boolean;
}
export declare const grokProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"grok">;
    from: z.ZodString;
    patterns: z.ZodArray<z.ZodString>;
    pattern_definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Dissect processor
 */
export interface DissectProcessor extends ProcessorBaseWithWhere {
    action: 'dissect';
    from: string;
    pattern: string;
    append_separator?: string;
    ignore_missing?: boolean;
}
export declare const dissectProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"dissect">;
    from: z.ZodString;
    pattern: z.ZodString;
    append_separator: z.ZodOptional<z.ZodString>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Date processor
 */
export interface DateProcessor extends ProcessorBaseWithWhere {
    action: 'date';
    from: string;
    to?: string;
    formats: string[];
    output_format?: string;
    timezone?: string;
    locale?: string;
}
export declare const dateProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"date">;
    from: z.ZodString;
    to: z.ZodOptional<z.ZodString>;
    formats: z.ZodArray<z.ZodString>;
    output_format: z.ZodOptional<z.ZodString>;
    timezone: z.ZodOptional<z.ZodString>;
    locale: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Rename processor
 */
export interface RenameProcessor extends ProcessorBaseWithWhere {
    action: 'rename';
    from: string;
    to: string;
    ignore_missing?: boolean;
    override?: boolean;
}
export declare const renameProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"rename">;
    from: z.ZodString;
    to: z.ZodString;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
    override: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Set processor
 */
export interface SetProcessor extends ProcessorBaseWithWhere {
    action: 'set';
    to: string;
    override?: boolean;
    value?: unknown;
    copy_from?: string;
}
export declare const setProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"set">;
    to: z.ZodString;
    override: z.ZodOptional<z.ZodBoolean>;
    value: z.ZodOptional<z.ZodUnknown>;
    copy_from: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Append processor
 */
export interface AppendProcessor extends ProcessorBaseWithWhere {
    action: 'append';
    to: string;
    value: unknown[];
    allow_duplicates?: boolean;
}
export declare const appendProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"append">;
    to: z.ZodString;
    value: z.ZodArray<z.ZodUnknown>;
    allow_duplicates: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Convert processor
 */
export interface BaseConvertProcessor extends ProcessorBase {
    action: 'convert';
    from: string;
    type: ConvertType;
    ignore_missing?: boolean;
}
export interface ConvertProcessor extends BaseConvertProcessor {
    to?: string;
    where?: Condition;
}
export declare const convertProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"convert">;
    from: z.ZodString;
    to: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<{
        string: "string";
        boolean: "boolean";
        integer: "integer";
        long: "long";
        double: "double";
    }>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * RemoveByPrefix processor
 */
export interface RemoveByPrefixProcessor extends ProcessorBase {
    action: 'remove_by_prefix';
    from: string;
}
export declare const removeByPrefixProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    action: z.ZodLiteral<"remove_by_prefix">;
    from: z.ZodString;
}, z.core.$strip>;
/**
 * Remove processor
 */
export interface RemoveProcessor extends ProcessorBaseWithWhere {
    action: 'remove';
    from: string;
    ignore_missing?: boolean;
}
export declare const removeProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"remove">;
    from: z.ZodString;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Drop processor
 */
export interface DropDocumentProcessor extends ProcessorBaseWithWhere {
    action: 'drop_document';
}
export declare const dropDocumentProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"drop_document">;
}, z.core.$strip>;
/**
 * Replace processor
 */
export interface ReplaceProcessor extends ProcessorBaseWithWhere {
    action: 'replace';
    from: string;
    pattern: string;
    replacement: string;
    to?: string;
    ignore_missing?: boolean;
}
export declare const replaceProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"replace">;
    from: z.ZodString;
    pattern: z.ZodString;
    replacement: z.ZodString;
    to: z.ZodOptional<z.ZodString>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Redact processor
 *
 * Uses Grok patterns to identify and mask sensitive data.
 * For Ingest Pipelines, this maps to the native ES redact processor.
 * For ESQL, this is emulated using replace() with compiled Grok patterns.
 */
export interface RedactProcessor extends ProcessorBaseWithWhere {
    action: 'redact';
    from: string;
    patterns: string[];
    pattern_definitions?: Record<string, string>;
    prefix?: string;
    suffix?: string;
    ignore_missing?: boolean;
}
export declare const redactProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"redact">;
    from: z.ZodString;
    patterns: z.ZodArray<z.ZodString>;
    pattern_definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    prefix: z.ZodOptional<z.ZodString>;
    suffix: z.ZodOptional<z.ZodString>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Math processor
 */
export interface MathProcessor extends ProcessorBaseWithWhere {
    action: 'math';
    expression: string;
    to: string;
    ignore_missing?: boolean;
}
export declare const mathProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"math">;
    expression: z.ZodString;
    to: z.ZodString;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export interface UppercaseProcessor extends ProcessorBaseWithWhere {
    action: 'uppercase';
    from: string;
    to?: string;
    ignore_missing?: boolean;
}
export declare const uppercaseProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"uppercase">;
    from: z.ZodString;
    to: z.ZodOptional<z.ZodString>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export interface LowercaseProcessor extends ProcessorBaseWithWhere {
    action: 'lowercase';
    from: string;
    to?: string;
    ignore_missing?: boolean;
}
export declare const lowercaseProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"lowercase">;
    from: z.ZodString;
    to: z.ZodOptional<z.ZodString>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export interface TrimProcessor extends ProcessorBaseWithWhere {
    action: 'trim';
    from: string;
    to?: string;
    ignore_missing?: boolean;
}
export declare const trimProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"trim">;
    from: z.ZodString;
    to: z.ZodOptional<z.ZodString>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export interface JoinProcessor extends ProcessorBaseWithWhere {
    action: 'join';
    from: string[];
    delimiter: string;
    to: string;
    ignore_missing?: boolean;
}
export declare const joinProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"join">;
    from: z.ZodArray<z.ZodString>;
    delimiter: z.ZodString;
    to: z.ZodString;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export interface SplitProcessor extends ProcessorBaseWithWhere {
    action: 'split';
    from: string;
    separator: string;
    to?: string;
    ignore_missing?: boolean;
    preserve_trailing?: boolean;
}
export declare const splitProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"split">;
    from: z.ZodString;
    separator: z.ZodString;
    to: z.ZodOptional<z.ZodString>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
    preserve_trailing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Sort processor
 */
export type SortOrder = 'asc' | 'desc';
export declare const sortOrders: readonly ["asc", "desc"];
export interface SortProcessor extends ProcessorBaseWithWhere {
    action: 'sort';
    from: string;
    to?: string;
    order?: SortOrder;
    ignore_missing?: boolean;
}
export declare const sortProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"sort">;
    from: z.ZodString;
    to: z.ZodOptional<z.ZodString>;
    order: z.ZodOptional<z.ZodEnum<{
        desc: "desc";
        asc: "asc";
    }>>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * JsonExtract processor
 *
 * Extracts values from JSON strings using JSONPath-like selectors.
 */
export declare const jsonExtractTypes: readonly ["keyword", "integer", "long", "double", "boolean"];
export type JsonExtractType = (typeof jsonExtractTypes)[number];
export interface JsonExtraction {
    selector: string;
    target_field: string;
    type?: JsonExtractType;
}
export interface JsonExtractProcessor extends ProcessorBaseWithWhere {
    action: 'json_extract';
    field: string;
    extractions: JsonExtraction[];
    ignore_missing?: boolean;
}
export declare const jsonExtractProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"json_extract">;
    field: z.ZodString;
    extractions: z.ZodArray<z.ZodObject<{
        selector: z.ZodString;
        target_field: z.ZodString;
        type: z.ZodOptional<z.ZodEnum<{
            boolean: "boolean";
            integer: "integer";
            keyword: "keyword";
            long: "long";
            double: "double";
        }>>;
    }, z.core.$strip>>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Concat processor
 */
interface ConcatFromField {
    type: 'field';
    value: string;
}
interface ConcatFromLiteral {
    type: 'literal';
    value: string;
}
type ConcatFrom = ConcatFromField | ConcatFromLiteral;
export interface ConcatProcessor extends ProcessorBaseWithWhere {
    action: 'concat';
    from: ConcatFrom[];
    to: string;
    ignore_missing?: boolean;
}
export declare const concatProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"concat">;
    from: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodLiteral<"field">;
        value: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"literal">;
        value: z.ZodString;
    }, z.core.$strip>]>>;
    to: z.ZodString;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Network direction processor
 */
export interface NetworkDirectionWithInternalNetworks {
    internal_networks: string[];
}
export interface NetworkDirectionWithInternalNetworksField {
    internal_networks_field: string;
}
export interface NetworkDirectionCommonFields extends ProcessorBaseWithWhere {
    action: 'network_direction';
    source_ip: string;
    destination_ip: string;
    target_field?: string;
    ignore_missing?: boolean;
}
export type NetworkDirectionProcessor = NetworkDirectionCommonFields & (NetworkDirectionWithInternalNetworks | NetworkDirectionWithInternalNetworksField);
export declare const networkDirectionProcessorSchema: z.ZodIntersection<z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"network_direction">;
    source_ip: z.ZodString;
    destination_ip: z.ZodString;
    target_field: z.ZodOptional<z.ZodString>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodUnion<readonly [z.ZodObject<{
    internal_networks: z.ZodArray<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    internal_networks_field: z.ZodString;
}, z.core.$strip>]>>;
/**
 * Enrich processor
 */
export interface EnrichProcessor extends ProcessorBaseWithWhere {
    action: 'enrich';
    policy_name: string;
    to: string;
    ignore_missing?: boolean;
    override?: boolean;
}
export declare const enrichProcessorSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"enrich">;
    policy_name: z.ZodString;
    to: z.ZodString;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
    override: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Registered domain processor
 */
export interface RegisteredDomainProcessor extends ProcessorBaseWithWhere {
    action: 'registered_domain';
    expression: string;
    prefix: string;
    ignore_missing?: boolean;
}
export declare const registeredDomainSchema: z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"registered_domain">;
    expression: z.ZodString;
    prefix: z.ZodString;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type StreamlangProcessorDefinition = DateProcessor | DissectProcessor | DropDocumentProcessor | GrokProcessor | MathProcessor | RenameProcessor | SetProcessor | AppendProcessor | ConvertProcessor | RemoveByPrefixProcessor | RemoveProcessor | ReplaceProcessor | RedactProcessor | UppercaseProcessor | LowercaseProcessor | TrimProcessor | JoinProcessor | SplitProcessor | SortProcessor | ConcatProcessor | NetworkDirectionProcessor | JsonExtractProcessor | EnrichProcessor | RegisteredDomainProcessor | ManualIngestPipelineProcessor;
export declare const streamlangProcessorSchema: z.ZodUnion<readonly [z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"grok">;
    from: z.ZodString;
    patterns: z.ZodArray<z.ZodString>;
    pattern_definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"dissect">;
    from: z.ZodString;
    pattern: z.ZodString;
    append_separator: z.ZodOptional<z.ZodString>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"date">;
    from: z.ZodString;
    to: z.ZodOptional<z.ZodString>;
    formats: z.ZodArray<z.ZodString>;
    output_format: z.ZodOptional<z.ZodString>;
    timezone: z.ZodOptional<z.ZodString>;
    locale: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"drop_document">;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"math">;
    expression: z.ZodString;
    to: z.ZodString;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"rename">;
    from: z.ZodString;
    to: z.ZodString;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
    override: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"set">;
    to: z.ZodString;
    override: z.ZodOptional<z.ZodBoolean>;
    value: z.ZodOptional<z.ZodUnknown>;
    copy_from: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"append">;
    to: z.ZodString;
    value: z.ZodArray<z.ZodUnknown>;
    allow_duplicates: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    action: z.ZodLiteral<"remove_by_prefix">;
    from: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"remove">;
    from: z.ZodString;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"replace">;
    from: z.ZodString;
    pattern: z.ZodString;
    replacement: z.ZodString;
    to: z.ZodOptional<z.ZodString>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"redact">;
    from: z.ZodString;
    patterns: z.ZodArray<z.ZodString>;
    pattern_definitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    prefix: z.ZodOptional<z.ZodString>;
    suffix: z.ZodOptional<z.ZodString>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"uppercase">;
    from: z.ZodString;
    to: z.ZodOptional<z.ZodString>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"lowercase">;
    from: z.ZodString;
    to: z.ZodOptional<z.ZodString>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"trim">;
    from: z.ZodString;
    to: z.ZodOptional<z.ZodString>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"join">;
    from: z.ZodArray<z.ZodString>;
    delimiter: z.ZodString;
    to: z.ZodString;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"split">;
    from: z.ZodString;
    separator: z.ZodString;
    to: z.ZodOptional<z.ZodString>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
    preserve_trailing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"sort">;
    from: z.ZodString;
    to: z.ZodOptional<z.ZodString>;
    order: z.ZodOptional<z.ZodEnum<{
        desc: "desc";
        asc: "asc";
    }>>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"convert">;
    from: z.ZodString;
    to: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<{
        string: "string";
        boolean: "boolean";
        integer: "integer";
        long: "long";
        double: "double";
    }>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"concat">;
    from: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodLiteral<"field">;
        value: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"literal">;
        value: z.ZodString;
    }, z.core.$strip>]>>;
    to: z.ZodString;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodIntersection<z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"network_direction">;
    source_ip: z.ZodString;
    destination_ip: z.ZodString;
    target_field: z.ZodOptional<z.ZodString>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodUnion<readonly [z.ZodObject<{
    internal_networks: z.ZodArray<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    internal_networks_field: z.ZodString;
}, z.core.$strip>]>>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"json_extract">;
    field: z.ZodString;
    extractions: z.ZodArray<z.ZodObject<{
        selector: z.ZodString;
        target_field: z.ZodString;
        type: z.ZodOptional<z.ZodEnum<{
            boolean: "boolean";
            integer: "integer";
            keyword: "keyword";
            long: "long";
            double: "double";
        }>>;
    }, z.core.$strip>>;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"enrich">;
    policy_name: z.ZodString;
    to: z.ZodString;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
    override: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"registered_domain">;
    expression: z.ZodString;
    prefix: z.ZodString;
    ignore_missing: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    customIdentifier: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ignore_failure: z.ZodOptional<z.ZodBoolean>;
    where: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    action: z.ZodLiteral<"manual_ingest_pipeline">;
    processors: z.ZodArray<z.ZodPipe<z.ZodRecord<z.ZodEnum<{
        remove: "remove";
        join: "join";
        sort: "sort";
        split: "split";
        trim: "trim";
        script: "script";
        circle: "circle";
        date: "date";
        bytes: "bytes";
        json: "json";
        geo_grid: "geo_grid";
        convert: "convert";
        set: "set";
        attachment: "attachment";
        enrich: "enrich";
        inference: "inference";
        fail: "fail";
        pipeline: "pipeline";
        append: "append";
        lowercase: "lowercase";
        uppercase: "uppercase";
        drop: "drop";
        cef: "cef";
        uri_parts: "uri_parts";
        user_agent: "user_agent";
        registered_domain: "registered_domain";
        rename: "rename";
        csv: "csv";
        fingerprint: "fingerprint";
        community_id: "community_id";
        date_index_name: "date_index_name";
        dissect: "dissect";
        dot_expander: "dot_expander";
        foreach: "foreach";
        ip_location: "ip_location";
        geoip: "geoip";
        grok: "grok";
        gsub: "gsub";
        html_strip: "html_strip";
        kv: "kv";
        network_direction: "network_direction";
        redact: "redact";
        reroute: "reroute";
        set_security_user: "set_security_user";
        terminate: "terminate";
        urldecode: "urldecode";
    }>, z.ZodUnknown>, z.ZodTransform<{
        [k: string]: unknown;
    }, Record<"remove" | "join" | "sort" | "split" | "trim" | "script" | "circle" | "date" | "bytes" | "json" | "geo_grid" | "convert" | "set" | "attachment" | "enrich" | "inference" | "fail" | "pipeline" | "append" | "lowercase" | "uppercase" | "drop" | "cef" | "uri_parts" | "user_agent" | "registered_domain" | "rename" | "csv" | "fingerprint" | "community_id" | "date_index_name" | "dissect" | "dot_expander" | "foreach" | "ip_location" | "geoip" | "grok" | "gsub" | "html_strip" | "kv" | "network_direction" | "redact" | "reroute" | "set_security_user" | "terminate" | "urldecode", unknown>>>>;
    tag: z.ZodOptional<z.ZodString>;
    on_failure: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, z.core.$strip>]>;
export declare const isProcessWithOverrideOption: <TValue extends {
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
}>(value: TValue) => value is Extract<TValue, {
    action: "rename";
    from: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
    override?: boolean | undefined;
} | {
    action: "set";
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    override?: boolean | undefined;
    value?: unknown;
    copy_from?: string | undefined;
} | {
    action: "enrich";
    policy_name: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
    override?: boolean | undefined;
}>;
export declare const isProcessWithIgnoreMissingOption: <TValue extends {
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
}>(value: TValue) => value is Extract<TValue, {
    action: "grok";
    from: string;
    patterns: string[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    pattern_definitions?: Record<string, string> | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "dissect";
    from: string;
    pattern: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    append_separator?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "rename";
    from: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
    override?: boolean | undefined;
} | {
    action: "convert";
    from: string;
    type: "string" | "boolean" | "integer" | "long" | "double";
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "replace";
    from: string;
    pattern: string;
    replacement: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "redact";
    from: string;
    patterns: string[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    pattern_definitions?: Record<string, string> | undefined;
    prefix?: string | undefined;
    suffix?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "math";
    expression: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | {
    action: "split";
    from: string;
    separator: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
    preserve_trailing?: boolean | undefined;
} | {
    action: "json_extract";
    field: string;
    extractions: {
        selector: string;
        target_field: string;
        type?: "boolean" | "integer" | "keyword" | "long" | "double" | undefined;
    }[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | {
    action: "enrich";
    policy_name: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
    override?: boolean | undefined;
} | {
    action: "registered_domain";
    expression: string;
    prefix: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
}>;
export declare const isGrokProcessorDefinition: <TValue extends {
    action: "manual_ingest_pipeline";
    processors: Record<"remove" | "join" | "sort" | "split" | "trim" | "script" | "circle" | "date" | "bytes" | "json" | "geo_grid" | "convert" | "set" | "attachment" | "enrich" | "inference" | "fail" | "pipeline" | "append" | "lowercase" | "uppercase" | "drop" | "cef" | "uri_parts" | "user_agent" | "registered_domain" | "rename" | "csv" | "fingerprint" | "community_id" | "date_index_name" | "dissect" | "dot_expander" | "foreach" | "ip_location" | "geoip" | "grok" | "gsub" | "html_strip" | "kv" | "network_direction" | "redact" | "reroute" | "set_security_user" | "terminate" | "urldecode", unknown>[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    tag?: string | undefined;
    on_failure?: Record<string, unknown>[] | undefined;
} | {
    action: "grok";
    from: string;
    patterns: string[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    pattern_definitions?: Record<string, string> | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "dissect";
    from: string;
    pattern: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    append_separator?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "date";
    from: string;
    formats: string[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    output_format?: string | undefined;
    timezone?: string | undefined;
    locale?: string | undefined;
} | {
    action: "rename";
    from: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
    override?: boolean | undefined;
} | {
    action: "set";
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    override?: boolean | undefined;
    value?: unknown;
    copy_from?: string | undefined;
} | {
    action: "append";
    to: string;
    value: unknown[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    allow_duplicates?: boolean | undefined;
} | {
    action: "convert";
    from: string;
    type: "string" | "boolean" | "integer" | "long" | "double";
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "remove_by_prefix";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
} | {
    action: "remove";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | {
    action: "drop_document";
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
} | {
    action: "replace";
    from: string;
    pattern: string;
    replacement: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "redact";
    from: string;
    patterns: string[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    pattern_definitions?: Record<string, string> | undefined;
    prefix?: string | undefined;
    suffix?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "math";
    expression: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | {
    action: "uppercase";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "lowercase";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "trim";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "join";
    from: string[];
    delimiter: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | {
    action: "split";
    from: string;
    separator: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
    preserve_trailing?: boolean | undefined;
} | {
    action: "sort";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    order?: "desc" | "asc" | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "json_extract";
    field: string;
    extractions: {
        selector: string;
        target_field: string;
        type?: "boolean" | "integer" | "keyword" | "long" | "double" | undefined;
    }[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | {
    action: "concat";
    from: ({
        type: "field";
        value: string;
    } | {
        type: "literal";
        value: string;
    })[];
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | ({
    action: "network_direction";
    source_ip: string;
    destination_ip: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    target_field?: string | undefined;
    ignore_missing?: boolean | undefined;
} & ({
    internal_networks: string[];
} | {
    internal_networks_field: string;
})) | {
    action: "enrich";
    policy_name: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
    override?: boolean | undefined;
} | {
    action: "registered_domain";
    expression: string;
    prefix: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
}>(value: TValue) => value is Extract<TValue, {
    action: "grok";
    from: string;
    patterns: string[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    pattern_definitions?: Record<string, string> | undefined;
    ignore_missing?: boolean | undefined;
}>;
export declare const isDissectProcessorDefinition: <TValue extends {
    action: "manual_ingest_pipeline";
    processors: Record<"remove" | "join" | "sort" | "split" | "trim" | "script" | "circle" | "date" | "bytes" | "json" | "geo_grid" | "convert" | "set" | "attachment" | "enrich" | "inference" | "fail" | "pipeline" | "append" | "lowercase" | "uppercase" | "drop" | "cef" | "uri_parts" | "user_agent" | "registered_domain" | "rename" | "csv" | "fingerprint" | "community_id" | "date_index_name" | "dissect" | "dot_expander" | "foreach" | "ip_location" | "geoip" | "grok" | "gsub" | "html_strip" | "kv" | "network_direction" | "redact" | "reroute" | "set_security_user" | "terminate" | "urldecode", unknown>[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    tag?: string | undefined;
    on_failure?: Record<string, unknown>[] | undefined;
} | {
    action: "grok";
    from: string;
    patterns: string[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    pattern_definitions?: Record<string, string> | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "dissect";
    from: string;
    pattern: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    append_separator?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "date";
    from: string;
    formats: string[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    output_format?: string | undefined;
    timezone?: string | undefined;
    locale?: string | undefined;
} | {
    action: "rename";
    from: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
    override?: boolean | undefined;
} | {
    action: "set";
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    override?: boolean | undefined;
    value?: unknown;
    copy_from?: string | undefined;
} | {
    action: "append";
    to: string;
    value: unknown[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    allow_duplicates?: boolean | undefined;
} | {
    action: "convert";
    from: string;
    type: "string" | "boolean" | "integer" | "long" | "double";
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "remove_by_prefix";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
} | {
    action: "remove";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | {
    action: "drop_document";
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
} | {
    action: "replace";
    from: string;
    pattern: string;
    replacement: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "redact";
    from: string;
    patterns: string[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    pattern_definitions?: Record<string, string> | undefined;
    prefix?: string | undefined;
    suffix?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "math";
    expression: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | {
    action: "uppercase";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "lowercase";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "trim";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "join";
    from: string[];
    delimiter: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | {
    action: "split";
    from: string;
    separator: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
    preserve_trailing?: boolean | undefined;
} | {
    action: "sort";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    order?: "desc" | "asc" | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "json_extract";
    field: string;
    extractions: {
        selector: string;
        target_field: string;
        type?: "boolean" | "integer" | "keyword" | "long" | "double" | undefined;
    }[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | {
    action: "concat";
    from: ({
        type: "field";
        value: string;
    } | {
        type: "literal";
        value: string;
    })[];
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | ({
    action: "network_direction";
    source_ip: string;
    destination_ip: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    target_field?: string | undefined;
    ignore_missing?: boolean | undefined;
} & ({
    internal_networks: string[];
} | {
    internal_networks_field: string;
})) | {
    action: "enrich";
    policy_name: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
    override?: boolean | undefined;
} | {
    action: "registered_domain";
    expression: string;
    prefix: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
}>(value: TValue) => value is Extract<TValue, {
    action: "dissect";
    from: string;
    pattern: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    append_separator?: string | undefined;
    ignore_missing?: boolean | undefined;
}>;
export declare const isDateProcessorDefinition: <TValue extends {
    action: "manual_ingest_pipeline";
    processors: Record<"remove" | "join" | "sort" | "split" | "trim" | "script" | "circle" | "date" | "bytes" | "json" | "geo_grid" | "convert" | "set" | "attachment" | "enrich" | "inference" | "fail" | "pipeline" | "append" | "lowercase" | "uppercase" | "drop" | "cef" | "uri_parts" | "user_agent" | "registered_domain" | "rename" | "csv" | "fingerprint" | "community_id" | "date_index_name" | "dissect" | "dot_expander" | "foreach" | "ip_location" | "geoip" | "grok" | "gsub" | "html_strip" | "kv" | "network_direction" | "redact" | "reroute" | "set_security_user" | "terminate" | "urldecode", unknown>[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    tag?: string | undefined;
    on_failure?: Record<string, unknown>[] | undefined;
} | {
    action: "grok";
    from: string;
    patterns: string[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    pattern_definitions?: Record<string, string> | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "dissect";
    from: string;
    pattern: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    append_separator?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "date";
    from: string;
    formats: string[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    output_format?: string | undefined;
    timezone?: string | undefined;
    locale?: string | undefined;
} | {
    action: "rename";
    from: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
    override?: boolean | undefined;
} | {
    action: "set";
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    override?: boolean | undefined;
    value?: unknown;
    copy_from?: string | undefined;
} | {
    action: "append";
    to: string;
    value: unknown[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    allow_duplicates?: boolean | undefined;
} | {
    action: "convert";
    from: string;
    type: "string" | "boolean" | "integer" | "long" | "double";
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "remove_by_prefix";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
} | {
    action: "remove";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | {
    action: "drop_document";
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
} | {
    action: "replace";
    from: string;
    pattern: string;
    replacement: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "redact";
    from: string;
    patterns: string[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    pattern_definitions?: Record<string, string> | undefined;
    prefix?: string | undefined;
    suffix?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "math";
    expression: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | {
    action: "uppercase";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "lowercase";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "trim";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "join";
    from: string[];
    delimiter: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | {
    action: "split";
    from: string;
    separator: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
    preserve_trailing?: boolean | undefined;
} | {
    action: "sort";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    order?: "desc" | "asc" | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "json_extract";
    field: string;
    extractions: {
        selector: string;
        target_field: string;
        type?: "boolean" | "integer" | "keyword" | "long" | "double" | undefined;
    }[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | {
    action: "concat";
    from: ({
        type: "field";
        value: string;
    } | {
        type: "literal";
        value: string;
    })[];
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | ({
    action: "network_direction";
    source_ip: string;
    destination_ip: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    target_field?: string | undefined;
    ignore_missing?: boolean | undefined;
} & ({
    internal_networks: string[];
} | {
    internal_networks_field: string;
})) | {
    action: "enrich";
    policy_name: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
    override?: boolean | undefined;
} | {
    action: "registered_domain";
    expression: string;
    prefix: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
}>(value: TValue) => value is Extract<TValue, {
    action: "date";
    from: string;
    formats: string[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    output_format?: string | undefined;
    timezone?: string | undefined;
    locale?: string | undefined;
}>;
export declare const isRedactProcessorDefinition: <TValue extends {
    action: "manual_ingest_pipeline";
    processors: Record<"remove" | "join" | "sort" | "split" | "trim" | "script" | "circle" | "date" | "bytes" | "json" | "geo_grid" | "convert" | "set" | "attachment" | "enrich" | "inference" | "fail" | "pipeline" | "append" | "lowercase" | "uppercase" | "drop" | "cef" | "uri_parts" | "user_agent" | "registered_domain" | "rename" | "csv" | "fingerprint" | "community_id" | "date_index_name" | "dissect" | "dot_expander" | "foreach" | "ip_location" | "geoip" | "grok" | "gsub" | "html_strip" | "kv" | "network_direction" | "redact" | "reroute" | "set_security_user" | "terminate" | "urldecode", unknown>[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    tag?: string | undefined;
    on_failure?: Record<string, unknown>[] | undefined;
} | {
    action: "grok";
    from: string;
    patterns: string[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    pattern_definitions?: Record<string, string> | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "dissect";
    from: string;
    pattern: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    append_separator?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "date";
    from: string;
    formats: string[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    output_format?: string | undefined;
    timezone?: string | undefined;
    locale?: string | undefined;
} | {
    action: "rename";
    from: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
    override?: boolean | undefined;
} | {
    action: "set";
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    override?: boolean | undefined;
    value?: unknown;
    copy_from?: string | undefined;
} | {
    action: "append";
    to: string;
    value: unknown[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    allow_duplicates?: boolean | undefined;
} | {
    action: "convert";
    from: string;
    type: "string" | "boolean" | "integer" | "long" | "double";
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "remove_by_prefix";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
} | {
    action: "remove";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | {
    action: "drop_document";
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
} | {
    action: "replace";
    from: string;
    pattern: string;
    replacement: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "redact";
    from: string;
    patterns: string[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    pattern_definitions?: Record<string, string> | undefined;
    prefix?: string | undefined;
    suffix?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "math";
    expression: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | {
    action: "uppercase";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "lowercase";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "trim";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "join";
    from: string[];
    delimiter: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | {
    action: "split";
    from: string;
    separator: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    ignore_missing?: boolean | undefined;
    preserve_trailing?: boolean | undefined;
} | {
    action: "sort";
    from: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    to?: string | undefined;
    order?: "desc" | "asc" | undefined;
    ignore_missing?: boolean | undefined;
} | {
    action: "json_extract";
    field: string;
    extractions: {
        selector: string;
        target_field: string;
        type?: "boolean" | "integer" | "keyword" | "long" | "double" | undefined;
    }[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | {
    action: "concat";
    from: ({
        type: "field";
        value: string;
    } | {
        type: "literal";
        value: string;
    })[];
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
} | ({
    action: "network_direction";
    source_ip: string;
    destination_ip: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    target_field?: string | undefined;
    ignore_missing?: boolean | undefined;
} & ({
    internal_networks: string[];
} | {
    internal_networks_field: string;
})) | {
    action: "enrich";
    policy_name: string;
    to: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
    override?: boolean | undefined;
} | {
    action: "registered_domain";
    expression: string;
    prefix: string;
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    ignore_missing?: boolean | undefined;
}>(value: TValue) => value is Extract<TValue, {
    action: "redact";
    from: string;
    patterns: string[];
    customIdentifier?: string | undefined;
    description?: string | undefined;
    ignore_failure?: boolean | undefined;
    where?: unknown;
    pattern_definitions?: Record<string, string> | undefined;
    prefix?: string | undefined;
    suffix?: string | undefined;
    ignore_missing?: boolean | undefined;
}>;
/**
 * ProcessorType is the union of all possible 'action' values
 */
export type ProcessorType = StreamlangProcessorDefinition['action'];
/**
 * Get all processor types as a string array (derived from the Zod schema)
 */
export declare const processorTypes: ProcessorType[];
/**
 * Get the processor type (action) from a processor definition
 */
export declare function getProcessorType<TProcessorDefinition extends StreamlangProcessorDefinition>(processor: TProcessorDefinition): ProcessorType;
export {};
