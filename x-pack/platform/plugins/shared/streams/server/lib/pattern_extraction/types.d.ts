import type { GrokPatternNode } from '@kbn/grok-heuristics';
import type { DissectPattern } from '@kbn/dissect-heuristics';
export interface GrokExtractionPayload {
    type: 'grok';
    messages: string[];
}
export interface GrokExtractionResult {
    type: 'grok';
    patternGroups: Array<{
        messages: string[];
        nodes: GrokPatternNode[];
    }>;
}
export interface DissectExtractionPayload {
    type: 'dissect';
    messages: string[];
}
export interface DissectExtractionResult {
    type: 'dissect';
    dissectPattern: DissectPattern;
    largestGroupMessages: string[];
}
