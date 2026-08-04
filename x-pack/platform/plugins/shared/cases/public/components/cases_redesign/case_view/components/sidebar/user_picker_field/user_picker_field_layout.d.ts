import React, { type ReactNode } from 'react';
import type { Assignee } from '../../../../../user_profiles/types';
export interface UserPickerFieldPanelLayoutProps {
    title: string;
    dataTestSubj: string;
    labelTestSubj: string;
    isLoading: boolean;
    hasUsers: boolean;
    children: ReactNode;
}
export declare const UserPickerFieldPanelLayout: React.FC<UserPickerFieldPanelLayoutProps>;
export declare const UserAvatarList: React.FC<{
    users: Assignee[];
    caseId: string;
    caseTitle: string;
}>;
