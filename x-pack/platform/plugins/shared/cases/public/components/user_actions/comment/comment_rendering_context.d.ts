import React from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { CaseUI } from '../../../containers/types';
/**
 * Context value for comment attachment rendering concerns.
 * All fields are required when providing the context; consumers receive
 * Partial when outside the provider (e.g. tests) via useCommentRenderingContext.
 */
export interface CommentRenderingContextValue {
    appId: string;
    caseData: CaseUI;
    userProfiles: Map<string, UserProfileWithAvatar>;
    commentRefs: React.MutableRefObject<Record<string, unknown>>;
    manageMarkdownEditIds: string[];
    selectedOutlineCommentId: string;
    loadingCommentIds: string[];
    euiTheme: EuiThemeComputed<{}>;
    handleManageMarkdownEditId: (id: string) => void;
    handleSaveComment: (props: {
        id: string;
        version: string;
    }, content: string) => void;
    handleManageQuote: (quote: string) => void;
    handleDeleteComment: (id: string, title: string) => void;
}
/**
 * Hook to access comment rendering context.
 * Returns partial when used outside CommentRenderingProvider (e.g. in tests).
 */
export declare const useCommentRenderingContext: () => Partial<CommentRenderingContextValue>;
export declare const CommentRenderingProvider: React.FC<{
    value: CommentRenderingContextValue;
    children: React.ReactNode;
}>;
