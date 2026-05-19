import React from 'react';
interface ActionPoliciesSearchBarProps {
    onSearchChange: (search: string) => void;
    enabled: string;
    onEnabledChange: (enabled: string) => void;
    selectedTags: string[];
    onTagsChange: (tags: string[]) => void;
}
export declare const ActionPoliciesSearchBar: ({ onSearchChange, enabled, onEnabledChange, selectedTags, onTagsChange, }: ActionPoliciesSearchBarProps) => React.JSX.Element;
export {};
