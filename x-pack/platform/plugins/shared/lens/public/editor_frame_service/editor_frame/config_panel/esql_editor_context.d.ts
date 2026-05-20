import type { MutableRefObject } from 'react';
export interface ESQLEditorContextValue {
    editorHeightRef: MutableRefObject<number | undefined>;
}
export declare const ESQLEditorContext: import("react").Context<ESQLEditorContextValue | undefined>;
export declare const useESQLEditorContext: () => ESQLEditorContextValue | undefined;
