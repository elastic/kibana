import type { ExternalReferenceAttachment } from '../../../../common/types/domain';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import type { SnakeToCamelCase } from '../../../../common/types';
type BuilderArgs = Pick<UserActionBuilderArgs, 'userAction' | 'externalReferenceAttachmentTypeRegistry' | 'caseData' | 'handleDeleteComment' | 'userProfiles'> & {
    attachment: SnakeToCamelCase<ExternalReferenceAttachment>;
    isLoading: boolean;
};
export declare const createExternalReferenceAttachmentUserActionBuilder: ({ userAction, userProfiles, attachment, externalReferenceAttachmentTypeRegistry, caseData, isLoading, handleDeleteComment, }: BuilderArgs) => ReturnType<UserActionBuilder>;
export {};
