import type { ReactNode } from 'react';
import React from 'react';
import type { DataViewEditorService } from '@kbn/data-view-editor-plugin/public';
interface DataViewEditorProps {
    id: string;
    label: ReactNode;
    dataViewEditorService: DataViewEditorService;
    indexPattern: string;
    setIndexPattern: (ip: string) => void;
    onError: (errorMsg?: string) => void;
    helpText?: ReactNode;
}
export declare function DataViewEditor({ id, label, dataViewEditorService, indexPattern, setIndexPattern, onError, helpText, }: DataViewEditorProps): React.JSX.Element;
export {};
