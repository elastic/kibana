import type YAML from 'yaml';
import type { monaco } from '@kbn/monaco';
/**
 * Context information for hover providers
 */
export interface ActionHoverContext {
    /** The action type (e.g., "grok", "dissect", "set") */
    actionType: string;
    /** YAML path segments to the current position */
    yamlPath: string[];
    /** Current value at the cursor position */
    currentValue: string;
    /** Monaco editor position */
    position: monaco.Position;
    /** Monaco editor model */
    model: monaco.editor.ITextModel;
    /** YAML document */
    yamlDocument: YAML.Document;
}
