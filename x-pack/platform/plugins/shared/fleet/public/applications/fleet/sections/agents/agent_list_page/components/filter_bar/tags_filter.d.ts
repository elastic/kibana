import React from 'react';
interface Props {
    tags: string[];
    selectedTags: string[];
    onSelectedTagsChange: (selectedTags: string[]) => void;
}
export declare const TagsFilter: React.FunctionComponent<Props>;
export {};
