import type { EuiCommentProps } from '@elastic/eui';
import type { UserActionBuilder, UserActionBuilderArgs } from './types';
type BuilderArgs = Pick<UserActionBuilderArgs, 'userAction' | 'handleOutlineComment' | 'userProfiles'> & {
    label: EuiCommentProps['event'];
    icon: EuiCommentProps['timelineAvatar'];
};
export declare const createCommonUpdateUserActionBuilder: ({ userProfiles, userAction, label, icon, handleOutlineComment, }: BuilderArgs) => ReturnType<UserActionBuilder>;
export {};
