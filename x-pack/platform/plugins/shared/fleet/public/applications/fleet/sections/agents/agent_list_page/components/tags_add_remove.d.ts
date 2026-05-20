import React from 'react';
interface Props {
    agentId?: string;
    agents?: string[] | string;
    allTags: string[];
    selectedTags: string[];
    button: HTMLElement;
    onTagsUpdated: (tagsToAdd: string[]) => void;
    onClosePopover: () => void;
}
export declare const TagsAddRemove: React.FC<Props>;
export {};
