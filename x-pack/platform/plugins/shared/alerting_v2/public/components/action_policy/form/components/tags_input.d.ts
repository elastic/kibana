import React from 'react';
interface TagsInputProps {
    value: string[];
    onChange: (tags: string[]) => void;
}
export declare const TagsInput: ({ value, onChange }: TagsInputProps) => React.JSX.Element;
export {};
