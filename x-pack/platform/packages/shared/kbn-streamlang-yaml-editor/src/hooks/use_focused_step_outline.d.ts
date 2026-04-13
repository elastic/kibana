import { monaco } from '@kbn/monaco';
import type { YamlLineMap } from '../utils/yaml_line_mapper';
interface FocusedStepInfo {
    stepId: string;
    lineStart: number;
    lineEnd: number;
}
export declare const useFocusedStepOutline: (editor: monaco.editor.IStandaloneCodeEditor | null, yamlLineMap: YamlLineMap | undefined) => {
    styles: import("@emotion/utils").SerializedStyles;
    focusedStepInfo: FocusedStepInfo | null;
};
export {};
