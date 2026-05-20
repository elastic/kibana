import type { EuiCommentProps } from '@elastic/eui';
import React from 'react';
import type { AttachmentUIV2, UserActionUI } from '../../containers/types';
import type { UserActionTreeProps } from './types';
import type { AddCommentRefObject } from '../add_comment';
import type { UserActionMarkdownRefObject } from './markdown_form';
export type UserActionListProps = Omit<UserActionTreeProps, 'userActivityQueryParams' | 'userActionsStats' | 'onUpdateField' | 'statusActionButton'> & {
    commentRefs: React.MutableRefObject<Record<string, AddCommentRefObject | UserActionMarkdownRefObject | null | undefined>>;
    handleManageQuote: (quote: string) => void;
    caseUserActions: UserActionUI[];
    attachments: AttachmentUIV2[];
    bottomActions?: EuiCommentProps[];
    isExpandable?: boolean;
};
export declare const UserActionsList: React.MemoExoticComponent<({ caseUserActions, attachments, caseConnectors, userProfiles, currentUserProfile, data: caseData, casesConfiguration, actionsNavigation, commentRefs, handleManageQuote, bottomActions, isExpandable, }: UserActionListProps) => React.JSX.Element>;
