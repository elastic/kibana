import React from 'react';
import type { ReferencedContentItem } from './skill_form_validation';
export declare const DEFAULT_REFERENCED_FILE: ReferencedContentItem;
export interface ReferencedContentFileRowProps {
    index: number;
    skillName: string;
    onRemove: () => void;
    isEditing: boolean;
    canEdit: boolean;
    onStartEdit: () => void;
    onStopEdit: () => void;
}
export declare const ReferencedContentFileRow: React.FC<ReferencedContentFileRowProps>;
