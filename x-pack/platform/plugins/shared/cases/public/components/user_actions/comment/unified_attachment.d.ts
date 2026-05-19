import type { UnifiedAttachment } from '../../../../common/types/domain';
import type { SnakeToCamelCase } from '../../../../common/types';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
type BuilderArgs = Pick<UserActionBuilderArgs, 'userAction' | 'unifiedAttachmentTypeRegistry' | 'caseData' | 'handleDeleteComment' | 'userProfiles' | 'manageMarkdownEditIds' | 'selectedOutlineCommentId' | 'loadingCommentIds' | 'appId' | 'euiTheme'> & {
    attachment: SnakeToCamelCase<UnifiedAttachment>;
    isLoading: boolean;
};
export declare const createUnifiedAttachmentUserActionBuilder: ({ userAction, userProfiles, attachment, unifiedAttachmentTypeRegistry, caseData, isLoading, handleDeleteComment, manageMarkdownEditIds, selectedOutlineCommentId, loadingCommentIds, appId, euiTheme, }: BuilderArgs) => ReturnType<UserActionBuilder>;
export {};
