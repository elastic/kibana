import { monaco } from '@kbn/monaco';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
interface UserDefaultInfo {
    uid: string;
    name: string;
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
}
export declare const useUserPickerValidation: (editor: monaco.editor.IStandaloneCodeEditor | null, value: string, security: SecurityPluginStart) => void;
export declare function collectUserPickerDefaults(yamlContent: string, userPickerFields: Array<Record<string, unknown>>): UserDefaultInfo[];
export {};
