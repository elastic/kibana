import type { EuiCommentProps } from '@elastic/eui';
import React from 'react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { CaseUI } from '../../../containers/types';
import type { AddCommentRefObject } from '../../add_comment';
import type { UserActionMarkdownRefObject } from '../../user_actions/markdown_form';
import type { UseUserActionsHandler } from '../../user_actions/use_user_actions_handler';
export interface UserActionListProps {
    comments: EuiCommentProps[];
    commentRefs: React.MutableRefObject<Record<string, AddCommentRefObject | UserActionMarkdownRefObject | null | undefined>>;
    handleManageQuote: (quote: string) => void;
    caseData: CaseUI;
    userProfiles: Map<string, UserProfileWithAvatar>;
    actionsHandler: UseUserActionsHandler;
}
export declare const UserActionsList: React.MemoExoticComponent<({ comments, caseData, userProfiles, commentRefs, handleManageQuote, actionsHandler, }: UserActionListProps) => React.JSX.Element>;
