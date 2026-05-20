import React from 'react';
interface Props {
    tagName: string;
    isTagHovered: boolean;
    onTagsUpdated: (tagsToAdd: string[], tagsToRemove: string[], hasCompleted?: boolean) => void;
}
export declare const TagOptions: React.FC<Props>;
export {};
