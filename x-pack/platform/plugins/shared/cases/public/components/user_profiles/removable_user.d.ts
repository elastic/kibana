import React from 'react';
import type { Assignee } from './types';
export interface UserRepresentationProps {
    assignee: Assignee;
    onRemoveAssignee: (removedAssigneeUID: string) => void;
}
export declare const RemovableUser: React.NamedExoticComponent<UserRepresentationProps>;
