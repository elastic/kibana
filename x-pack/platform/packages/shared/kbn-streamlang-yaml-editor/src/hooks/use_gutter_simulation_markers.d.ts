import { monaco } from '@kbn/monaco';
import type { ProcessorsMetrics, StepSummary } from '../types';
import type { YamlLineMap } from '../utils/yaml_line_mapper';
export declare const useGutterSimulationMarkers: (editor: monaco.editor.IStandaloneCodeEditor | null, canRunSimulation: boolean, hasSimulationResult: boolean, processorsMetrics?: ProcessorsMetrics, yamlLineMap?: YamlLineMap, stepSummary?: StepSummary) => void;
