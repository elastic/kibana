import type { monaco } from '@kbn/monaco';
import type { ValidationError } from '../components/template_yaml_validation_accordion';
interface UseValidationAccordionPositioningReturn {
    editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
    validationErrors: ValidationError[];
    isEditorMounted: boolean;
    handleValidationChange: (errors: ValidationError[]) => void;
    handleEditorMount: (isMounted: boolean, editor?: monaco.editor.IStandaloneCodeEditor) => void;
    handleErrorClick: (error: ValidationError) => void;
}
/**
 * Wires the YAML editor to its validation accordion: tracks the Monaco instance,
 * the current validation errors, and click-to-line navigation. The accordion is
 * rendered inline (in normal flow) beneath the editor, so no manual positioning is
 * required — it tracks the panel width via the layout, not JavaScript.
 */
export declare const useValidationAccordionPositioning: () => UseValidationAccordionPositioningReturn;
export {};
