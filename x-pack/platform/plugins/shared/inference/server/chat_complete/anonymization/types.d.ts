import type { Anonymization, RegexAnonymizationRule } from '@kbn/inference-common';
/**
 * AnonymizationRecord maps JSON Pointer paths to string values that need anonymization.
 * Keys are RFC-6901 JSON Pointer paths (e.g. "/content", "/toolCalls/0/function/arguments").
 *
 * Note: JSON Pointer paths should always contain string values.
 * The undefined is for system messages which may be optional.
 */
export interface AnonymizationRecord {
    [jsonPointerPath: string]: string | undefined;
}
/**
 * AnonymizationState is both the input and the output for executing
 * an anonymization rule.
 */
export interface AnonymizationState {
    records: Array<Record<string, string>>;
    anonymizations: Anonymization[];
}
export interface DetectedMatch {
    recordIndex: number;
    recordKey: string;
    start: number;
    end: number;
    matchValue: string;
    class_name: string;
    ruleIndex: number;
}
export interface AnonymizationRegexWorkerTaskPayload {
    rules: RegexAnonymizationRule[];
    records: Array<Record<string, string>>;
}
/**
 * RFC-6901 JSON Pointer token escape/unescape utilities.
 */
export declare const escapePointerToken: (token: string) => string;
export declare const unescapePointerToken: (token: string) => string;
