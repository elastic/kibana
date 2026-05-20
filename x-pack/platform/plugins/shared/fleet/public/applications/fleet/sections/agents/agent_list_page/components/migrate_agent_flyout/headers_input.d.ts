import React from 'react';
interface HeadersInputProps {
    headers: Record<string, string>;
    onUpdate: (headers: Record<string, string>) => void;
}
export declare const HeadersInput: React.FC<HeadersInputProps>;
export {};
