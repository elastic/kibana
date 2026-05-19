import type { DataView } from '@kbn/data-plugin/common';
export interface ScriptField {
    source: string;
    lang: string;
}
export declare function getDocValueAndSourceFields(indexPattern: DataView, fieldNames: string[], dateFormat: string): {
    docValueFields: Array<string | {
        format: string;
        field: string;
    }>;
    sourceOnlyFields: string[];
    scriptFields: Record<string, {
        script: ScriptField;
    }>;
};
