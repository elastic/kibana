import type { monaco } from '@kbn/monaco';
import type { ValidationError } from '../components/template_yaml_validation_accordion';
interface UseValidationAccordionPositioningReturn {
    containerRef: React.MutableRefObject<HTMLDivElement | null>;
    accordionRef: React.MutableRefObject<HTMLDivElement | null>;
    editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
    containerBounds: {
        left: number;
        width: number;
    };
    accordionHeight: number;
    portalNode: HTMLElement | null;
    validationErrors: ValidationError[];
    isEditorMounted: boolean;
    handleValidationChange: (errors: ValidationError[]) => void;
    handleEditorMount: (isMounted: boolean, editor?: monaco.editor.IStandaloneCodeEditor) => void;
    handleErrorClick: (error: ValidationError) => void;
}
export declare const useValidationAccordionPositioning: () => UseValidationAccordionPositioningReturn;
export {};
