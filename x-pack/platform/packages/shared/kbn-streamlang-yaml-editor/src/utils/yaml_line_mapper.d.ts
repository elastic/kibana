import type { StepDecoration, StepSummary } from '../types';
export interface YamlLineMap {
    [stepId: string]: {
        lineStart: number;
        lineEnd: number;
    };
}
/**
 * Parse YAML string and map each step's deterministic customIdentifier to its line ranges.
 * Since customIdentifiers are stripped from the YAML before rendering, we regenerate them
 * using the same deterministic approach as addStepIdentifiers (content hash + path).
 */
export declare function mapStepsToYamlLines(yamlString: string): YamlLineMap;
/**
 * Convert step summary (status map) to Monaco decorations using the line map
 */
export declare function getStepDecorations(stepSummary: StepSummary, yamlLineMap: YamlLineMap): StepDecoration[];
