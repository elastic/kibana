import React from 'react';
/**
 * It identifies the type of array values.
 * It allows forcing numeric values like 123 to be parsed as string by wrapping them in quotes.
 */
export declare const parseArrayEntry: (rawValue: string) => string | number | undefined;
export declare const parseFormData: (formData: Record<string, any>, parameters: Array<{
    name: string;
    type: string;
}>) => Record<string, any>;
export interface ToolTestFlyoutProps {
    toolId: string;
    onClose: () => void;
}
export declare const ToolTestFlyout: React.FC<ToolTestFlyoutProps>;
