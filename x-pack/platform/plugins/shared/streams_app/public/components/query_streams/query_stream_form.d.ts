import React from 'react';
import type { ESQLEditorProps } from '@kbn/esql/public';
import { StreamNameFormRow } from '../stream_name_form_row';
export declare function QueryStreamForm({ children }: React.PropsWithChildren<{}>): React.JSX.Element;
export declare namespace QueryStreamForm {
    var StreamName: typeof StreamNameFormRow;
    var ESQLEditor: ({ errors, query, onTextLangQueryChange, onTextLangQuerySubmit, isLoading, }: Pick<ESQLEditorProps, "errors" | "query" | "onTextLangQueryChange" | "onTextLangQuerySubmit" | "isLoading">) => React.JSX.Element;
}
