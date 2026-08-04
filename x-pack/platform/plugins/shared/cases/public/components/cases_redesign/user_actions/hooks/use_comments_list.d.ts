import React from 'react';
import type { EuiCommentProps } from '@elastic/eui';
import type { CurrentUserProfile } from '../../../types';
interface UseCommentsListArgs {
    builtInfiniteActions: EuiCommentProps[];
    builtLastPageActions: EuiCommentProps[];
    hasNextPage: boolean | undefined;
    remainingActionCount: number;
    fetchNextPage: (() => void) | undefined;
    isFetchingNextPage: boolean;
    shouldShowCommentEditor: boolean;
    currentUserProfile: CurrentUserProfile;
    commentEditor: React.ReactNode;
}
export declare const useCommentsList: ({ builtInfiniteActions, builtLastPageActions, hasNextPage, remainingActionCount, fetchNextPage, isFetchingNextPage, shouldShowCommentEditor, currentUserProfile, commentEditor, }: UseCommentsListArgs) => EuiCommentProps[];
export {};
