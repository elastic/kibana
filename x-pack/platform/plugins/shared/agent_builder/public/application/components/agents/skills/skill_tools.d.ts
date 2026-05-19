import React from 'react';
export interface SkillToolsProps {
    skillToolIds: string[];
    onToolClick: (toolId: string) => void;
}
export declare const SkillTools: ({ skillToolIds, onToolClick }: SkillToolsProps) => React.JSX.Element | null;
