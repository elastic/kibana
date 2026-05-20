import type { ActionsAttachment } from '../../../../common/types/domain';
import type { UserActionBuilder, UserActionBuilderArgs } from '../../user_actions/types';
import type { SnakeToCamelCase } from '../../../../common/types';
type BuilderArgs = Pick<UserActionBuilderArgs, 'userAction' | 'actionsNavigation' | 'userProfiles'> & {
    attachment: SnakeToCamelCase<ActionsAttachment>;
};
export declare const createActionAttachmentUserActionBuilder: ({ userAction, userProfiles, attachment, actionsNavigation, }: BuilderArgs) => ReturnType<UserActionBuilder>;
export {};
