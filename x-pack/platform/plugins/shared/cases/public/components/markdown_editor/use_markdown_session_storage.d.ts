import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
export interface SessionStorageType {
    field: FieldHook<string>;
    sessionKey: string;
    initialValue: string | undefined;
}
export declare const useMarkdownSessionStorage: ({ field, sessionKey, initialValue, }: SessionStorageType) => {
    hasConflicts: boolean;
};
