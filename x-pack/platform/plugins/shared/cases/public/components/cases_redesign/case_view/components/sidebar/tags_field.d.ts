import React from 'react';
export interface TagsFieldProps {
    isLoading: boolean;
    onSubmit: (tags: string[]) => void;
    tags: string[];
}
export declare const TagsField: React.FC<TagsFieldProps>;
