import { monaco } from '@kbn/monaco';
import type { StreamlangValidationError } from '@kbn/streamlang';
import type { YamlLineMap } from '../utils/yaml_line_mapper';
/**
 * Adds validation error gutter markers to the Monaco editor.
 * These markers appear as warning icons in the gutter and show error details on hover.
 */
export declare const useGutterValidationMarkers: (editor: monaco.editor.IStandaloneCodeEditor | null, validationErrors: Map<string, StreamlangValidationError[]> | undefined, yamlLineMap: YamlLineMap | undefined) => void;
