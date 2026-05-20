/**
 * A list of common date format keywords supported by Streamlang.
 * Useful for interoperability purposes, for example Ingest Pipelines Date Processor supports these
 * but not others e.g. ES|QL.
 */
export declare const commonDatePresets: readonly ["ISO8601", "UNIX", "UNIX_MS", "RFC1123", "YYYY-MM-DD", "COMMON_LOG"];
export type CommonDatePreset = (typeof commonDatePresets)[number];
