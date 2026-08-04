import React from 'react';
interface ParamsEditorProps {
    value: string;
    onChange: (next: string) => void;
    height?: string | number;
}
export declare const ParamsEditor: ({ value, onChange, height }: ParamsEditorProps) => React.JSX.Element;
export {};
