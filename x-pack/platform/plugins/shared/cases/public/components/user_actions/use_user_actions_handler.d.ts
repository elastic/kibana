import type { CaseUI } from '../../containers/types';
import type { AddCommentRefObject } from '../add_comment';
import type { UserActionMarkdownRefObject } from './markdown_form';
import type { UserActionBuilderArgs } from './types';
export type UseUserActionsHandler = Pick<UserActionBuilderArgs, 'loadingCommentIds' | 'selectedOutlineCommentId' | 'manageMarkdownEditIds' | 'handleOutlineComment' | 'handleDeleteComment'> & {
    commentRefs: React.MutableRefObject<Record<string, AddCommentRefObject | UserActionMarkdownRefObject | null | undefined>>;
    handleManageMarkdownEditId: (id: string) => void;
    handleSaveComment: (props: {
        id: string;
        version: string;
    }, content: string) => void;
    handleManageQuote: (quote: string) => void;
    handleUpdate: (updatedCase: CaseUI) => void;
};
export declare const useUserActionsHandler: () => UseUserActionsHandler;
