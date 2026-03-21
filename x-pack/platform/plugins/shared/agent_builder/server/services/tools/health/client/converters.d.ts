import type { ToolHealthDocument, ToolHealthState } from './types';
/**
 * Converts an Elasticsearch document to an application-level ToolHealthState.
 */
export declare const fromEs: (doc: ToolHealthDocument) => ToolHealthState;
