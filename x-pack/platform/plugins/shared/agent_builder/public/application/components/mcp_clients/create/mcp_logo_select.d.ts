import React from 'react';
export interface McpLogoSelectValue {
    id: string;
    dataUrl: string;
}
export interface McpLogoSelectProps {
    value: McpLogoSelectValue | null;
    onChange: (value: McpLogoSelectValue | null) => void;
}
export declare const McpLogoSelect: ({ value, onChange }: McpLogoSelectProps) => React.JSX.Element;
