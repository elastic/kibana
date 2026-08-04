import React from 'react';
export interface McpLogoUploadValue {
    file: File;
    dataUrl: string;
}
export interface McpLogoUploadProps {
    value: McpLogoUploadValue | null;
    onChange: (value: McpLogoUploadValue | null) => void;
}
export declare const MAX_LOGO_FILE_SIZE_BYTES: number;
export declare const McpLogoUpload: ({ value, onChange }: McpLogoUploadProps) => React.JSX.Element;
