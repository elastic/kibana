import type { TaskOutput } from '../types';
export declare const getStringMeta: (metadata: Record<string, unknown> | null | undefined, key: string) => string | undefined;
export declare const getBooleanMeta: (metadata: Record<string, unknown> | null | undefined, key: string) => boolean;
export declare const extractAllStrings: (value: unknown, out: string[], maxStrings?: number, maxLen?: number) => void;
export declare const getToolCallSteps: (output: TaskOutput) => Array<{
    tool_id?: string;
    results?: unknown[];
}>;
export declare const getFinalAssistantMessage: (output: TaskOutput) => string;
export declare const extractMaxSemver: (text: string) => string | undefined;
export declare const extractReleaseDateNearVersion: (text: string, version: string) => string | undefined;
export declare const includesOneOf: (text: string, patterns: string[]) => boolean;
export declare const containsAllTerms: (text: string, terms: string[]) => boolean;
