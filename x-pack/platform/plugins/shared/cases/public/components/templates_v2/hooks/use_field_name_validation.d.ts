import { monaco } from '@kbn/monaco';
interface FieldNameInfo {
    name: string;
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
}
export declare const useFieldNameValidation: (editor: monaco.editor.IStandaloneCodeEditor | null, value: string) => void;
export declare function collectFieldNames(yamlContent: string, fields: unknown[]): FieldNameInfo[];
export declare function createDuplicateFieldMarkers(fieldInfos: FieldNameInfo[]): monaco.editor.IMarkerData[];
export {};
