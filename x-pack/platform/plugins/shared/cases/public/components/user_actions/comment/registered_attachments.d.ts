import type { AttachmentType } from '../../../client/attachment_framework/types';
import type { AttachmentTypeRegistry } from '../../../../common/registry';
import type { AttachmentV2 } from '../../../../common/types/domain';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import type { SnakeToCamelCase } from '../../../../common/types';
type BuilderArgs<C, R> = Pick<UserActionBuilderArgs, 'userAction' | 'caseData' | 'handleDeleteComment' | 'userProfiles'> & {
    attachment: SnakeToCamelCase<C>;
    registry: R;
    isLoading: boolean;
    getId: () => string;
    getAttachmentViewProps: () => object;
};
export declare const createRegisteredAttachmentUserActionBuilder: <C extends AttachmentV2, R extends AttachmentTypeRegistry<AttachmentType<any>>>({ userAction, userProfiles, attachment, registry, caseData, isLoading, getId, getAttachmentViewProps, handleDeleteComment, }: BuilderArgs<C, R>) => ReturnType<UserActionBuilder>;
export {};
