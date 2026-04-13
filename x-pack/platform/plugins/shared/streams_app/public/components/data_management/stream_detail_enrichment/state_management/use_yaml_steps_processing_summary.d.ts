import type { StepStatus } from '@kbn/streamlang-yaml-editor';
export type YamlStepsProcessingSummaryMap = Map<string, StepStatus>;
export declare const useYamlStepsProcessingSummary: () => YamlStepsProcessingSummaryMap;
