import type { EuiCommentProps, EuiThemeComputed } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { AttachmentUIV2, UserActionUI, CasesConfigurationUI, CaseUI, CaseConnectors } from '../../../../containers/types';
import type { CurrentUserProfile } from '../../../types';
import type { ExternalReferenceAttachmentTypeRegistry } from '../../../../client/attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from '../../../../client/attachment_framework/persistable_state_registry';
import type { UnifiedAttachmentTypeRegistry } from '../../../../client/attachment_framework/unified_attachment_registry';
interface UseBuildUserActionsArgs {
    caseUserActions: UserActionUI[];
    attachments: AttachmentUIV2[];
    caseData: CaseUI;
    casesConfiguration: CasesConfigurationUI;
    caseConnectors: CaseConnectors;
    userProfiles: Map<string, UserProfileWithAvatar>;
    currentUserProfile: CurrentUserProfile;
    appId: string;
    externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
    persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
    unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
    manageMarkdownEditIds: string[];
    selectedOutlineCommentId: string;
    loadingCommentIds: string[];
    euiTheme: EuiThemeComputed<{}>;
    handleOutlineComment: (id: string) => void;
    handleDeleteComment: (id: string, successToasterTitle: string) => void;
}
export declare const useBuildUserActions: ({ caseUserActions, attachments, caseData, casesConfiguration, caseConnectors, userProfiles, currentUserProfile, appId, externalReferenceAttachmentTypeRegistry, persistableStateAttachmentTypeRegistry, unifiedAttachmentTypeRegistry, manageMarkdownEditIds, selectedOutlineCommentId, loadingCommentIds, euiTheme, handleOutlineComment, handleDeleteComment, }: UseBuildUserActionsArgs) => EuiCommentProps[];
export {};
