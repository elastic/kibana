import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { CaseConnectors, CaseUI, CasesConfigurationUI } from '../../../../containers/types';
import type { CurrentUserProfile } from '../../../types';
interface UseBuilderContextArgs {
    caseData: CaseUI;
    casesConfiguration: CasesConfigurationUI;
    caseConnectors: CaseConnectors;
    userProfiles: Map<string, UserProfileWithAvatar>;
    currentUserProfile: CurrentUserProfile;
    manageMarkdownEditIds: string[];
    selectedOutlineCommentId: string;
    loadingCommentIds: string[];
    handleOutlineComment: (id: string) => void;
    handleDeleteComment: (id: string, successToasterTitle: string) => void;
}
export declare const useBuilderContext: ({ caseData, casesConfiguration, caseConnectors, userProfiles, currentUserProfile, manageMarkdownEditIds, selectedOutlineCommentId, loadingCommentIds, handleOutlineComment, handleDeleteComment, }: UseBuilderContextArgs) => {
    appId: string;
    caseData: CaseUI;
    casesConfiguration: CasesConfigurationUI;
    caseConnectors: {
        [x: string]: {
            push: {
                needsToBePushed: boolean;
                hasBeenPushed: boolean;
                details?: {
                    latestUserActionPushDate: string;
                    oldestUserActionPushDate: string;
                    externalService: {
                        connectorId: string;
                        connectorName: string;
                        externalId: string;
                        externalTitle: string;
                        externalUrl: string;
                        pushedAt: string;
                        pushedBy: {
                            email: string | null | undefined;
                            fullName: string | null | undefined;
                            username: string | null | undefined;
                            profileUid?: string | undefined;
                        };
                    };
                } | undefined;
            };
            id: string;
            type: import("../../../../../common").ConnectorTypes.casesWebhook;
            fields: null;
            name: string;
        } | {
            push: {
                needsToBePushed: boolean;
                hasBeenPushed: boolean;
                details?: {
                    latestUserActionPushDate: string;
                    oldestUserActionPushDate: string;
                    externalService: {
                        connectorId: string;
                        connectorName: string;
                        externalId: string;
                        externalTitle: string;
                        externalUrl: string;
                        pushedAt: string;
                        pushedBy: {
                            email: string | null | undefined;
                            fullName: string | null | undefined;
                            username: string | null | undefined;
                            profileUid?: string | undefined;
                        };
                    };
                } | undefined;
            };
            id: string;
            type: import("../../../../../common").ConnectorTypes.jira;
            fields: {
                issueType: string | null;
                priority: string | null;
                parent: string | null;
                otherFields?: string | null | undefined;
            } | null;
            name: string;
        } | {
            push: {
                needsToBePushed: boolean;
                hasBeenPushed: boolean;
                details?: {
                    latestUserActionPushDate: string;
                    oldestUserActionPushDate: string;
                    externalService: {
                        connectorId: string;
                        connectorName: string;
                        externalId: string;
                        externalTitle: string;
                        externalUrl: string;
                        pushedAt: string;
                        pushedBy: {
                            email: string | null | undefined;
                            fullName: string | null | undefined;
                            username: string | null | undefined;
                            profileUid?: string | undefined;
                        };
                    };
                } | undefined;
            };
            id: string;
            type: import("../../../../../common").ConnectorTypes.none;
            fields: null;
            name: string;
        } | {
            push: {
                needsToBePushed: boolean;
                hasBeenPushed: boolean;
                details?: {
                    latestUserActionPushDate: string;
                    oldestUserActionPushDate: string;
                    externalService: {
                        connectorId: string;
                        connectorName: string;
                        externalId: string;
                        externalTitle: string;
                        externalUrl: string;
                        pushedAt: string;
                        pushedBy: {
                            email: string | null | undefined;
                            fullName: string | null | undefined;
                            username: string | null | undefined;
                            profileUid?: string | undefined;
                        };
                    };
                } | undefined;
            };
            id: string;
            type: import("../../../../../common").ConnectorTypes.resilient;
            fields: {
                incidentTypes: string[] | null;
                severityCode: string | null;
                additionalFields?: string | null | undefined;
            } | null;
            additionalFields?: string | null | undefined;
            name: string;
        } | {
            push: {
                needsToBePushed: boolean;
                hasBeenPushed: boolean;
                details?: {
                    latestUserActionPushDate: string;
                    oldestUserActionPushDate: string;
                    externalService: {
                        connectorId: string;
                        connectorName: string;
                        externalId: string;
                        externalTitle: string;
                        externalUrl: string;
                        pushedAt: string;
                        pushedBy: {
                            email: string | null | undefined;
                            fullName: string | null | undefined;
                            username: string | null | undefined;
                            profileUid?: string | undefined;
                        };
                    };
                } | undefined;
            };
            id: string;
            type: import("../../../../../common").ConnectorTypes.serviceNowITSM;
            fields: {
                impact: string | null;
                severity: string | null;
                urgency: string | null;
                category: string | null;
                subcategory: string | null;
                additionalFields?: string | null | undefined;
            } | null;
            name: string;
        } | {
            push: {
                needsToBePushed: boolean;
                hasBeenPushed: boolean;
                details?: {
                    latestUserActionPushDate: string;
                    oldestUserActionPushDate: string;
                    externalService: {
                        connectorId: string;
                        connectorName: string;
                        externalId: string;
                        externalTitle: string;
                        externalUrl: string;
                        pushedAt: string;
                        pushedBy: {
                            email: string | null | undefined;
                            fullName: string | null | undefined;
                            username: string | null | undefined;
                            profileUid?: string | undefined;
                        };
                    };
                } | undefined;
            };
            id: string;
            type: import("../../../../../common").ConnectorTypes.serviceNowSIR;
            fields: {
                category: string | null;
                destIp: boolean | null;
                malwareHash: boolean | null;
                malwareUrl: boolean | null;
                priority: string | null;
                sourceIp: boolean | null;
                subcategory: string | null;
                additionalFields?: string | null | undefined;
            } | null;
            name: string;
        } | {
            push: {
                needsToBePushed: boolean;
                hasBeenPushed: boolean;
                details?: {
                    latestUserActionPushDate: string;
                    oldestUserActionPushDate: string;
                    externalService: {
                        connectorId: string;
                        connectorName: string;
                        externalId: string;
                        externalTitle: string;
                        externalUrl: string;
                        pushedAt: string;
                        pushedBy: {
                            email: string | null | undefined;
                            fullName: string | null | undefined;
                            username: string | null | undefined;
                            profileUid?: string | undefined;
                        };
                    };
                } | undefined;
            };
            id: string;
            type: import("../../../../../common").ConnectorTypes.swimlane;
            fields: {
                caseId: string | null;
            } | null;
            name: string;
        } | {
            push: {
                needsToBePushed: boolean;
                hasBeenPushed: boolean;
                details?: {
                    latestUserActionPushDate: string;
                    oldestUserActionPushDate: string;
                    externalService: {
                        connectorId: string;
                        connectorName: string;
                        externalId: string;
                        externalTitle: string;
                        externalUrl: string;
                        pushedAt: string;
                        pushedBy: {
                            email: string | null | undefined;
                            fullName: string | null | undefined;
                            username: string | null | undefined;
                            profileUid?: string | undefined;
                        };
                    };
                } | undefined;
            };
            id: string;
            type: import("../../../../../common").ConnectorTypes.theHive;
            fields: {
                tlp: number | null;
            } | null;
            name: string;
        };
    };
    userProfiles: Map<string, UserProfileWithAvatar>;
    currentUserProfile: CurrentUserProfile;
    externalReferenceAttachmentTypeRegistry: import("../../../../client/attachment_framework/external_reference_registry").ExternalReferenceAttachmentTypeRegistry;
    persistableStateAttachmentTypeRegistry: import("../../../../client/attachment_framework/persistable_state_registry").PersistableStateAttachmentTypeRegistry;
    unifiedAttachmentTypeRegistry: import("../../../../client/attachment_framework/unified_attachment_registry").UnifiedAttachmentTypeRegistry;
    manageMarkdownEditIds: string[];
    selectedOutlineCommentId: string;
    loadingCommentIds: string[];
    euiTheme: import("@elastic/eui").EuiThemeComputed<{}>;
    handleOutlineComment: (id: string) => void;
    handleDeleteComment: (id: string, successToasterTitle: string) => void;
};
export {};
